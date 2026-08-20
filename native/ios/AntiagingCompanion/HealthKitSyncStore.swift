import HealthKit

final class HealthKitSyncStore {
    private typealias AnchoredResult = ([HKSample], [HKDeletedObject], HKQueryAnchor?)

    private let store = HKHealthStore()
    private var observerQueries: [HKObserverQuery] = []
    private let types: [(HKSampleType, String, HKUnit?)] = [
        (HKQuantityType(.stepCount), "steps", .count()),
        (HKQuantityType(.restingHeartRate), "resting_heart_rate", HKUnit.count().unitDivided(by: .minute())),
        (HKQuantityType(.heartRateVariabilitySDNN), "heart_rate_variability_sdnn", .secondUnit(with: .milli)),
        (HKQuantityType(.activeEnergyBurned), "active_energy", .kilocalorie()),
        (HKQuantityType(.vo2Max), "vo2_max", HKUnit(from: "ml/kg*min")),
        (HKCategoryType(.sleepAnalysis), "sleep_session", nil),
        (HKWorkoutType.workoutType(), "workout", nil),
    ]

    func authorize() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw NSError(domain: "HealthKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Apple Health is not available on this device."])
        }
        try await store.requestAuthorization(toShare: [], read: Set(types.map(\.0)))
        for (type, _, _) in types {
            try? await store.enableBackgroundDelivery(for: type, frequency: .hourly)
        }
        installObserversIfNeeded()
    }

    func syncAll() async throws -> Int {
        try await authorize()
        var count = 0
        for (type, code, unit) in types {
            count += try await sync(type: type, code: code, unit: unit)
        }
        return count
    }

    private func installObserversIfNeeded() {
        guard observerQueries.isEmpty else { return }
        observerQueries = types.map { type, code, unit in
            let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
                guard let self else { completion(); return }
                Task {
                    _ = try? await self.sync(type: type, code: code, unit: unit)
                    completion()
                }
            }
            store.execute(query)
            return query
        }
    }

    private func sync(type: HKSampleType, code: String, unit: HKUnit?) async throws -> Int {
        let key = "anchor.\(type.identifier)"
        let anchor = UserDefaults.standard.data(forKey: key).flatMap {
            try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: $0)
        }
        let result: AnchoredResult = try await withCheckedThrowingContinuation { continuation in
            let query = HKAnchoredObjectQuery(
                type: type,
                predicate: nil,
                anchor: anchor,
                limit: HKObjectQueryNoLimit
            ) { _, samples, deleted, newAnchor, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: (samples ?? [], deleted ?? [], newAnchor))
                }
            }
            store.execute(query)
        }

        let formatter = ISO8601DateFormatter()
        let timezone = TimeZone.current.identifier
        var payload = result.0.map { sample -> CompanionAPI.Sample in
            let quantity = (sample as? HKQuantitySample).flatMap { quantitySample in
                unit.map { quantitySample.quantity.doubleValue(for: $0) }
            }
            return .init(
                externalId: sample.uuid.uuidString,
                typeCode: code,
                value: quantity,
                unit: unit?.unitString,
                startAt: formatter.string(from: sample.startDate),
                endAt: formatter.string(from: sample.endDate),
                timezone: timezone,
                sourceName: sample.sourceRevision.source.name,
                sourceBundle: sample.sourceRevision.source.bundleIdentifier,
                device: [
                    "name": sample.device?.name ?? "",
                    "manufacturer": sample.device?.manufacturer ?? "",
                    "model": sample.device?.model ?? "",
                ],
                metadata: [:],
                deleted: false
            )
        }
        payload += result.1.map {
            .init(
                externalId: $0.uuid.uuidString,
                typeCode: code,
                value: nil,
                unit: unit?.unitString,
                startAt: formatter.string(from: Date()),
                endAt: formatter.string(from: Date()),
                timezone: timezone,
                sourceName: "Apple Health",
                sourceBundle: "com.apple.Health",
                device: [:],
                metadata: [:],
                deleted: true
            )
        }
        guard !payload.isEmpty else { return 0 }

        let anchorData = try result.2.map {
            try NSKeyedArchiver.archivedData(withRootObject: $0, requiringSecureCoding: true)
        } ?? Data()
        try await CompanionAPI.sync(samples: payload, cursor: anchorData.base64EncodedString())
        if let newAnchor = result.2 {
            let data = try NSKeyedArchiver.archivedData(withRootObject: newAnchor, requiringSecureCoding: true)
            UserDefaults.standard.set(data, forKey: key)
        }
        return payload.count
    }
}
