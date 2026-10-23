package de.phantomnetwork.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** „+30 Min geben“ aus der Tageslimit-Mitteilung: Bonus auf dem Master eintragen */
public class BonusReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        final Context ctx = context.getApplicationContext();
        final String pid = intent.getStringExtra("pid");
        final String name = intent.getStringExtra("name");
        final int nid = intent.getIntExtra("nid", 1);
        if (pid == null) return;
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try {
                PhantomCheckWorker.giveBonus(ctx, pid, 30);
                PhantomCheckWorker.notifyOne(ctx, nid, PhantomCheckWorker.L(ctx, "Phantom Network · Tageslimit", "Phantom Network · Daily limit"), PhantomCheckWorker.L(ctx, "+30 Min für " + name + " – die Geräte sind in etwa einer Minute wieder online.", "+30 min for " + name + " – the devices will be back online in about a minute."));
            } catch (Exception e) {
                PhantomCheckWorker.notifyOne(ctx, nid, PhantomCheckWorker.L(ctx, "Phantom Network · Tageslimit", "Phantom Network · Daily limit"), PhantomCheckWorker.L(ctx, "Bonus für " + name + " ging nicht: " + e.getMessage() + ". Bitte in der App versuchen.", "Bonus for " + name + " failed: " + e.getMessage() + ". Please try in the app."));
            } finally {
                pr.finish();
            }
        }).start();
    }
}
