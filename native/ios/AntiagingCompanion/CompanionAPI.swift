import Foundation
import Security

enum CompanionAPI {
    static let baseURL = URL(string: "https://app.antiaging-labs.com")!
    struct Registration: Decodable { let installationId: String; let token: String }
    struct Sample: Encodable { let externalId, typeCode: String; let value: Double?; let unit, startAt, endAt, timezone, sourceName, sourceBundle: String; let device: [String:String]; let metadata: [String:String]; let deleted: Bool }

    static func register(code: String, deviceName: String) async throws -> Registration {
        var request = URLRequest(url: baseURL.appending(path: "/api/native/register")); request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["pairingCode": code.uppercased(), "platform": "ios", "deviceName": deviceName, "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"])
        let (data,response) = try await URLSession.shared.data(for: request); guard (response as? HTTPURLResponse)?.statusCode == 201 else { throw URLError(.userAuthenticationRequired) }; return try JSONDecoder().decode(Registration.self, from: data)
    }
    static func sync(samples: [Sample], cursor: String) async throws {
        guard let token = KeychainStore.token else { throw URLError(.userAuthenticationRequired) }
        var request = URLRequest(url: baseURL.appending(path: "/api/native/sync")); request.httpMethod = "POST"; request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization"); request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        struct Body: Encodable { let idempotencyKey, cursor: String; let samples: [Sample] }
        request.httpBody = try JSONEncoder().encode(Body(idempotencyKey: UUID().uuidString, cursor: cursor, samples: samples)); let (_,response) = try await URLSession.shared.data(for: request); guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.cannotConnectToHost) }
    }
}

enum KeychainStore {
    static var token: String? {
        get { let query:[String:Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrAccount as String:"member-os-installation",kSecReturnData as String:true]; var value:AnyObject?; guard SecItemCopyMatching(query as CFDictionary,&value)==errSecSuccess,let data=value as? Data else{return nil};return String(data:data,encoding:.utf8) }
        set { let query:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrAccount as String:"member-os-installation"];SecItemDelete(query as CFDictionary);if let value=newValue { var item=query;item[kSecValueData as String]=Data(value.utf8);SecItemAdd(item as CFDictionary,nil) } }
    }
}
