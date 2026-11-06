#pragma once

#include <cstdint>
#include <cstddef>
#include "aegis_core.h"

namespace aegis {

enum class MeshTransport : uint8_t { LoRa, WiFi, Usb };

struct MeshEnvelope {
  uint8_t version{1};
  MeshTransport transport{MeshTransport::LoRa};
  char sender_node[40]{};
  char message_id[40]{};
  uint8_t payload[384]{};
  size_t payload_len{0};
  uint8_t signature[64]{};
};

class MeshTransportDriver {
 public:
  virtual ~MeshTransportDriver() = default;
  virtual bool send(const MeshEnvelope& envelope) = 0;
  virtual bool receive(MeshEnvelope& envelope) = 0;
  virtual bool available() const = 0;
};

class LoRaMesh : public MeshTransportDriver {
 public:
  bool begin(uint8_t frequency_band);
  bool send(const MeshEnvelope& envelope) override;
  bool receive(MeshEnvelope& envelope) override;
  bool available() const override;
  bool connected() const { return connected_; }
 private:
  uint8_t frequency_band_{0};
  bool connected_{false};
};

class MeshReplicator {
 public:
  explicit MeshReplicator(MeshTransportDriver& driver) : driver_(driver) {}
  bool publish_incident(const char* incident_id, const char* plant_id, const char* signal);
  bool poll(Request& request);
 private:
  MeshTransportDriver& driver_;
};

} // namespace aegis
