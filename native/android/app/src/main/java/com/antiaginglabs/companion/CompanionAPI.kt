package com.antiaginglabs.companion

import android.content.Context
import com.antiaginglabs.companion.BuildConfig.MEMBER_OS_BASE_URL
import kotlinx.serialization.json.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

object CompanionAPI {private val client=OkHttpClient();private const val PREFS="companion";private var context:Context?=null;val hasToken get()=context?.getSharedPreferences(PREFS,0)?.getString("token",null)!=null
  suspend fun register(ctx:Context,code:String){context=ctx.applicationContext;val body=buildJsonObject{put("pairingCode",code);put("platform","android");put("deviceName",android.os.Build.MODEL);put("appVersion",BuildConfig.VERSION_NAME)};val response=client.newCall(Request.Builder().url("$MEMBER_OS_BASE_URL/api/native/register").post(body.toString().toRequestBody("application/json".toMediaType())).build()).execute();if(!response.isSuccessful)error("Pairing code was not accepted");val token=Json.parseToJsonElement(response.body.string()).jsonObject["token"]!!.jsonPrimitive.content;ctx.getSharedPreferences(PREFS,0).edit().putString("token",token).apply()}
  fun installContext(ctx:Context){context=ctx.applicationContext}
  suspend fun sync(ctx:Context,cursor:String?,samples:JsonArray){installContext(ctx);val token=ctx.getSharedPreferences(PREFS,0).getString("token",null)?:error("Pair this phone first");val body=buildJsonObject{put("idempotencyKey",java.util.UUID.randomUUID().toString());cursor?.let{put("cursor",it)};put("samples",samples)};val request=Request.Builder().url("$MEMBER_OS_BASE_URL/api/native/sync").header("Authorization","Bearer $token").post(body.toString().toRequestBody("application/json".toMediaType())).build();client.newCall(request).execute().use{if(!it.isSuccessful)error("Sync failed (${it.code})")}}
}
