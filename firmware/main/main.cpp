#include "aegis_core.h"
#include "aegis_mesh.h"
#include "nvs_flash.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char* TAG = "aegis";

extern "C" void app_main() {
  esp_err_t nvs_result = nvs_flash_init();
  if (nvs_result == ESP_ERR_NVS_NO_FREE_PAGES || nvs_result == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    nvs_flash_erase();
    nvs_result = nvs_flash_init();
  }
  if (nvs_result != ESP_OK) {
    ESP_LOGE(TAG, "NVS initialization failed: %s", esp_err_to_name(nvs_result));
    return;
  }

  aegis::AegisCore core;
  if (!core.begin()) {
    ESP_LOGE(TAG, "Aegis identity initialization failed");
    return;
  }

  aegis::LoRaMesh lora;
  lora.begin(915);
  aegis::MeshReplicator mesh(lora);

  ESP_LOGI(TAG, "Aegis paired node online: %s", core.identity().node_id);
  ESP_LOGI(TAG, "Transport: LoRa mesh; internet is optional");

  // Main loop will later be replaced by the input/UI task and secure BLE/USB
  // handshake task. This scaffold intentionally keeps authorization local.
  while (true) {
    aegis::Request request{};
    if (mesh.poll(request)) {
      const auto decision = core.authorize(request);
      ESP_LOGI(TAG, "Request %s -> %s (%s)", request.request_id,
               aegis::decision_name(decision.decision), decision.reason);
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}
