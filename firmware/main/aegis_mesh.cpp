#include "aegis_mesh.h"
#include <cstring>
#include <cstdio>
#include "esp_log.h"

namespace aegis {
namespace { constexpr char kTag[] = "aegis_mesh"; }

bool LoRaMesh::begin(uint8_t frequency_band) {
  frequency_band_ = frequency_band;
  // Hardware radio setup is intentionally isolated here. The Tanmatsu board
  // variant can supply its SX126x/SX127x driver without changing policy code.
  connected_ = true;
  ESP_LOGI(kTag, "LoRa mesh prepared on %u MHz", frequency_band_);
  return connected_;
}

bool LoRaMesh::send(const MeshEnvelope& envelope) {
  if (!connected_ || envelope.payload_len > sizeof(envelope.payload)) return false;
  // Replace with the board's LoRa driver send call. Never send private medical
  // payloads without an encrypted envelope and a matched recipient policy.
  return true;
}

bool LoRaMesh::receive(MeshEnvelope& envelope) {
  (void)envelope;
  // Poll the radio driver here; false means no frame is waiting.
  return false;
}

bool LoRaMesh::available() const { return connected_; }

bool MeshReplicator::publish_incident(const char* incident_id, const char* plant_id, const char* signal) {
  if (!driver_.available() || !incident_id || !plant_id || !signal) return false;
  MeshEnvelope envelope{};
  std::snprintf(envelope.message_id, sizeof(envelope.message_id), "%s", incident_id);
  const int written = std::snprintf(reinterpret_cast<char*>(envelope.payload), sizeof(envelope.payload),
                                    "incident|%s|%s|%s", incident_id, plant_id, signal);
  if (written < 0 || static_cast<size_t>(written) >= sizeof(envelope.payload)) return false;
  envelope.payload_len = static_cast<size_t>(written);
  return driver_.send(envelope);
}

bool MeshReplicator::poll(Request& request) {
  MeshEnvelope envelope{};
  if (!driver_.receive(envelope)) return false;
  // Decode only signed, schema-versioned requests in the production driver.
  // This placeholder keeps untrusted radio bytes out of the authorization API.
  (void)request;
  return false;
}
} // namespace aegis
