package com.antiaginglabs.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.launch

class MainActivity:ComponentActivity(){override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);CompanionAPI.installContext(this);if(CompanionAPI.hasToken)HealthSyncWorker.schedule(this);setContent{MaterialTheme{CompanionScreen(HealthConnectSyncManager(this))}}}}

@Composable fun CompanionScreen(sync:HealthConnectSyncManager){val scope=rememberCoroutineScope();var code by remember{mutableStateOf("")};var status by remember{mutableStateOf(if(CompanionAPI.hasToken)"Ready to sync":"Enter the code from your member app")};val launcher=rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()){granted->scope.launch{status=if(granted.containsAll(sync.permissions))sync.syncAll() else "Choose the health categories you want to share"}}
  Surface(color=MaterialTheme.colorScheme.surface){Column(Modifier.fillMaxSize().padding(28.dp),verticalArrangement=Arrangement.spacedBy(20.dp)){Text("ANTIAGING LABS",style=MaterialTheme.typography.labelSmall);Text(if(CompanionAPI.hasToken)"Health Connect is connected." else "Bring your health data into focus.",style=MaterialTheme.typography.headlineLarge);Text(status,color=MaterialTheme.colorScheme.onSurfaceVariant)
    if(!CompanionAPI.hasToken){OutlinedTextField(value=code,onValueChange={code=it.uppercase().take(8)},label={Text("8-character code")});Button(enabled=code.length==8,onClick={scope.launch{status=runCatching{CompanionAPI.register(this@MainActivity,code);HealthSyncWorker.schedule(this@MainActivity);launcher.launch(sync.permissions);"Connected"}.getOrElse{it.message?:"Pairing failed"}}}){Text("Pair this phone")}}
    else {Button(onClick={launcher.launch(sync.permissions)}){Text("Sync now")};Text("Permissions stay under your control in Health Connect. Source app and device attribution are retained.",style=MaterialTheme.typography.bodySmall)}
  }}
}
