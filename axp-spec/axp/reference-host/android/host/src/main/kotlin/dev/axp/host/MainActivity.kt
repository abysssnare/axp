package dev.axp.host

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Text

/** 骨架入口：真实宿主在这里装载 .axp 包并挂载 ui.panel */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { Text("AXP Reference Host — 见 docs/integration-guide.md") }
    }
}
