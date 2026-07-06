package com.wemos.notification;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class NotificationReceiver extends BroadcastReceiver {
    
    private static final String TAG = "WemosNotificationReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received action: " + action);
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            // Device booted, start Wemos connection service
            Intent serviceIntent = new Intent(context, WemosConnectionService.class);
            context.startService(serviceIntent);
            Log.d(TAG, "Device boot completed, starting WemosConnectionService");
        }
    }
}