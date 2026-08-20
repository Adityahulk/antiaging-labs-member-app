package com.antiaginglabs.companion

import android.content.Context
import com.antiaginglabs.companion.BuildConfig.MEMBER_OS_BASE_URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

object CompanionAPI {
    private val client = OkHttpClient()
    private var context: Context? = null

    val hasToken: Boolean
        get() = context?.let { SecureTokenStore(it).read() } != null

    fun installContext(ctx: Context) {
        context = ctx.applicationContext
    }

    suspend fun register(ctx: Context, code: String) = withContext(Dispatchers.IO) {
        installContext(ctx)
        require(MEMBER_OS_BASE_URL.startsWith("https://")) { "The production API must use HTTPS" }
        val body = buildJsonObject {
            put("pairingCode", code.trim().uppercase())
            put("platform", "android")
            put("deviceName", android.os.Build.MODEL)
            put("appVersion", BuildConfig.VERSION_NAME)
        }
        client.newCall(
            Request.Builder()
                .url("$MEMBER_OS_BASE_URL/api/native/register")
                .post(body.toString().toRequestBody("application/json".toMediaType()))
                .build(),
        ).execute().use { response ->
            if (!response.isSuccessful) error("Pairing code was not accepted")
            val token = Json.parseToJsonElement(response.body.string())
                .jsonObject["token"]?.jsonPrimitive?.content
                ?: error("Pairing response was incomplete")
            SecureTokenStore(ctx).write(token)
        }
    }

    suspend fun sync(ctx: Context, cursor: String?, samples: JsonArray) = withContext(Dispatchers.IO) {
        installContext(ctx)
        val token = SecureTokenStore(ctx).read() ?: error("Pair this phone first")
        val body = buildJsonObject {
            put("idempotencyKey", java.util.UUID.randomUUID().toString())
            cursor?.let { put("cursor", it) }
            put("samples", samples)
        }
        val request = Request.Builder()
            .url("$MEMBER_OS_BASE_URL/api/native/sync")
            .header("Authorization", "Bearer $token")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(request).execute().use {
            if (!it.isSuccessful) error("Sync failed (${it.code})")
        }
    }
}
