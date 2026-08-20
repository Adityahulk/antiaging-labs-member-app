import SwiftUI
import UIKit

@main
struct AntiagingCompanionApp: App {
    @StateObject private var model = CompanionViewModel()
    var body: some Scene { WindowGroup { ContentView().environmentObject(model).task { await model.restoreAndSync() } } }
}

@MainActor final class CompanionViewModel: ObservableObject {
    @Published var pairingCode = ""
    @Published var state = "Enter the code shown in your member app"
    @Published var isPaired = KeychainStore.token != nil
    private let health = HealthKitSyncStore()

    func pair() async {
        do {
            let registration = try await CompanionAPI.register(code: pairingCode, deviceName: UIDevice.current.name)
            KeychainStore.token = registration.token
            isPaired = true
            state = "Connected. Choose what to share next."
            try await health.authorize()
            await sync()
        } catch { state = error.localizedDescription }
    }

    func restoreAndSync() async { if isPaired { await sync() } }
    func sync() async {
        guard KeychainStore.token != nil else { return }
        state = "Checking Apple Health…"
        do { let count = try await health.syncAll(); state = count == 0 ? "Up to date" : "Synced \(count) changes" }
        catch { state = error.localizedDescription }
    }
}

struct ContentView: View {
    @EnvironmentObject var model: CompanionViewModel
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 22) {
                Text("ANTIAGING LABS").font(.caption).tracking(2)
                Text(model.isPaired ? "Apple Health is connected." : "Bring your watch data into focus.").font(.system(size: 38, weight: .regular, design: .serif))
                Text(model.state).foregroundStyle(.secondary)
                if !model.isPaired {
                    TextField("8-character code", text: $model.pairingCode).textInputAutocapitalization(.characters).autocorrectionDisabled().padding().background(.thinMaterial).clipShape(RoundedRectangle(cornerRadius: 12))
                    Button("Pair this iPhone") { Task { await model.pair() } }.buttonStyle(.borderedProminent).tint(Color(red: .62, green: .28, blue: .18)).disabled(model.pairingCode.count < 8)
                } else {
                    Button("Sync now") { Task { await model.sync() } }.buttonStyle(.borderedProminent).tint(Color(red: .18, green: .30, blue: .30))
                    Text("Permissions stay under your control in Apple Health. Source app and device attribution are retained for every record.").font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
            }.padding(28).navigationTitle("Companion").navigationBarTitleDisplayMode(.inline)
        }
    }
}
