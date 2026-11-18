#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // ⭐ Linux (WebKitGTK): отключаем DMABUF-рендерер,
  //    иначе прозрачные панели (BottomBar) чернеют.
  //    Должно быть ДО tauri::Builder::default().
  #[cfg(target_os = "linux")]
  unsafe {
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  }
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}