package com.wemos.notification;

import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class WemosConnectionService extends Service {
    
    private static final String TAG = "WemosConnectionService";
    private static final String CHANNEL_ID = "wemos_service";
    private static final int SERVICE_NOTIFICATION_ID = 1;
    
    private PowerManager.WakeLock wakeLock;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "WemosConnectionService created");
        
        // Create notification channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Wemos Service",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
        
        // Acquire wake lock
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "WemosNotification:ServiceWakeLock"
        );
        wakeLock.acquire();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "WemosConnectionService started");
        
        // Start foreground service
        Notification notification = createForegroundNotification();
        startForeground(SERVICE_NOTIFICATION_ID, notification);
        
        return START_STICKY;
    }
    
    private Notification createForegroundNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Wemos Notification Service")
            .setContentText("Connected and listening for notifications")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setColor(ContextCompat.getColor(this, android.R.color.holo_blue_dark))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "WemosConnectionService destroyed");
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}