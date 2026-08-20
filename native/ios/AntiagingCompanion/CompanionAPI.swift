import Foundation
import Security

enum CompanionAPI {
    private static let baseURL: URL = {
        let configured = Bundle.main.object(forInfoDictionaryKey: "MEMBER_OS_BASE_URL") as? String
        guard let configured, let url = URL(string: configured), url.scheme == "https" else {
            preconditionFailure("MEMBER_OS_BASE_URL must be a valid HTTPS URL")
        }
        return url
    }()

    struct Registration: Decodable {
        let installationId: String
        let token: String
    }

    struct Sample: Encodable {
        let externalId: String
        let typeCode: String
        let value: Double?
        let unit: String?
        let startAt: String
        let endAt: String
        let timezone: String
        let sourceName: String
        let sourceBundle: String
        let device: [String: String]
        let metadata: [String: String]
        let deleted: Bool
    }

    private struct RegistrationBody: Encodable {
        let pairingCode: String
        let platform: String
        let deviceName: String
        let appVersion: String
    }

    static func register(code: String, deviceName: String) async throws -> Registration {
        var request = URLRequest(url: baseURL.appending(path: "/api/native/register"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(
            RegistrationBody(
                pairingCode: code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased(),
                platform: "ios",
                deviceName: deviceName,
                appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
            )
        )
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 201 else {
            throw URLError(.userAuthenticationRequired)
        }
        return try JSONDecoder().decode(Registration.self, from: data)
    }

    static func sync(samples: [Sample], cursor: String) async throws {
        guard let token = KeychainStore.token else { throw URLError(.userAuthenticationRequired) }
        var request = URLRequest(url: baseURL.appending(path: "/api/native/sync"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        struct Body: Encodable {
            let idempotencyKey: String
            let cursor: String
            let samples: [Sample]
        }
        request.httpBody = try JSONEncoder().encode(
            Body(idempotencyKey: UUID().uuidString, cursor: cursor, samples: samples)
        )
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.cannotConnectToHost)
        }
    }
}

enum KeychainStore {
    private static let service = "com.antiaginglabs.companion"
    private static let account = "member-os-installation"

    static var token: String? {
        get {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account,
                kSecReturnData as String: true,
                kSecMatchLimit as String: kSecMatchLimitOne,
            ]
            var value: AnyObject?
            guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess,
                  let data = value as? Data else { return nil }
            return String(data: data, encoding: .utf8)
        }
        set {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account,
            ]
            SecItemDelete(query as CFDictionary)
            guard let newValue else { return }
            var item = query
            item[kSecValueData as String] = Data(newValue.utf8)
            item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            SecItemAdd(item as CFDictionary, nil)
        }
    }
}
