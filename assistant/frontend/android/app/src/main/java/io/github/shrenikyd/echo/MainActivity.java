package io.github.shrenikyd.echo;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins defined in the app module are not auto-discovered the way plugins from
        // node_modules are, so this has to be registered by hand, before super.onCreate
        // builds the bridge.
        registerPlugin(LocalLlmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
