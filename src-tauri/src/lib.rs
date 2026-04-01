use tauri::{
    Emitter,
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
        let mute_state = Arc::new(AtomicBool::new(false));
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit App", true, None::<&str>)?;
            let mute_i = MenuItem::with_id(app, "mute", "Mute Notifications: Off", true, None::<&str>)?;
            let mute_i_clone = mute_i.clone();
            let show_i = MenuItem::with_id(app, "show", "Open App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &mute_i, &quit_i])?;
            let mute_state_clone = mute_state.clone();
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Pulse Break")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "mute" => {
                         let muted = !mute_state_clone.load(Ordering::Relaxed);
                        mute_state_clone.store(muted, Ordering::Relaxed);
                        // Update menu item text
                        let label = if muted {
                            "Mute Notifications: On"
                        } else {
                            "Mute Notifications: Off"
                        };
                       let _ = mute_i_clone.set_text(label);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("toggle-mute", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                 let _ = window.emit("window-hidden", ());
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}