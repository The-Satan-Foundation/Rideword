#pragma once

#include <cstdint>
#include <cstddef>

namespace aegis {

enum class Role : uint8_t { Unknown, Public, WaterTreatment, Clinician, EmergencyResponder, IssuerAdmin };
enum class Decision : uint8_t { Deny, Allow, AllowWithRedaction };
enum class DataClass : uint8_t { PublicIncident, SafetyStatus, Allergy, MedicalRecord, Credential, SensorEvidence };

struct Identity {
  char did[96]{};
  char node_id[40]{};
  char public_key[96]{};
};

struct Request {
  char request_id[40]{};
  char requester_did[96]{};
  Role requester_role{Role::Unknown};
  DataClass data_class{DataClass::PublicIncident};
  bool emergency{false};
  uint64_t issued_at{0};
  uint8_t signature[64]{};
};

struct DecisionRecord {
  Decision decision{Decision::Deny};
  char reason[160]{};
  char policy_id[48]{};
  uint64_t evaluated_at{0};
};

struct AuditEvent {
  uint64_t sequence{0};
  char event_id[40]{};
  char actor_did[96]{};
  char action[32]{};
  Decision decision{Decision::Deny};
  char data_class[32]{};
  uint64_t timestamp{0};
  uint8_t digest[32]{};
};

class AuditLog {
 public:
  bool append(const AuditEvent& event);
  size_t size() const;
  const AuditEvent* at(size_t index) const;
 private:
  static constexpr size_t kCapacity = 128;
  AuditEvent events_[kCapacity]{};
  size_t count_{0};
};

class AccessPolicy {
 public:
  DecisionRecord evaluate(const Request& request) const;
};

class AegisCore {
 public:
  bool begin();
  const Identity& identity() const { return identity_; }
  DecisionRecord authorize(const Request& request);
  bool record_sensor_incident(const char* incident_id, const char* plant_id, const char* signal);
  const AuditLog& audit() const { return audit_; }
 private:
  Identity identity_{};
  AccessPolicy policy_{};
  AuditLog audit_{};
  uint64_t sequence_{0};
};

const char* decision_name(Decision decision);
const char* role_name(Role role);
const char* data_class_name(DataClass data_class);

} // namespace aegis
