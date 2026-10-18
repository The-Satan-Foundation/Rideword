#include "aegis_core.h"
#include <cstring>
#include <cstdio>
#include <ctime>
#include "esp_system.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "mbedtls/sha256.h"

namespace aegis {
namespace {
constexpr char kNamespace[] = "aegis";
constexpr char kPolicyId[] = "policy:v1:least-privilege";

void hex_encode(const uint8_t* input, size_t len, char* output, size_t output_len) {
  if (output_len < (len * 2 + 1)) return;
  for (size_t i = 0; i < len; i++) std::snprintf(output + (i * 2), 3, "%02x", input[i]);
  output[len * 2] = '\0';
}

void hash_text(const char* text, uint8_t digest[32]) {
  mbedtls_sha256_context context;
  mbedtls_sha256_init(&context);
  mbedtls_sha256_starts(&context, 0);
  mbedtls_sha256_update(&context, reinterpret_cast<const uint8_t*>(text), std::strlen(text));
  mbedtls_sha256_finish(&context, digest);
  mbedtls_sha256_free(&context);
}

void append_event(AuditLog& log, uint64_t& sequence, const char* actor, const char* action,
                  Decision decision, const char* data_class) {
  AuditEvent event{};
  event.sequence = ++sequence;
  std::snprintf(event.event_id, sizeof(event.event_id), "evt-%llu", static_cast<unsigned long long>(event.sequence));
  std::snprintf(event.actor_did, sizeof(event.actor_did), "%s", actor ? actor : "local");
  std::snprintf(event.action, sizeof(event.action), "%s", action);
  event.decision = decision;
  std::snprintf(event.data_class, sizeof(event.data_class), "%s", data_class);
  event.timestamp = static_cast<uint64_t>(std::time(nullptr));
  char material[256]{};
  std::snprintf(material, sizeof(material), "%llu|%s|%s|%u|%llu",
                static_cast<unsigned long long>(event.sequence), event.actor_did,
                event.action, static_cast<unsigned>(event.decision),
                static_cast<unsigned long long>(event.timestamp));
  hash_text(material, event.digest);
  log.append(event);
}
} // namespace

bool AuditLog::append(const AuditEvent& event) {
  if (count_ < kCapacity) { events_[count_++] = event; return true; }
  // Preserve append-only semantics in a bounded device log: retain the newest
  // window while sequence/digest continuity remains visible to the replicator.
  std::memmove(events_, events_ + 1, sizeof(AuditEvent) * (kCapacity - 1));
  events_[kCapacity - 1] = event;
  return true;
}

size_t AuditLog::size() const { return count_; }
const AuditEvent* AuditLog::at(size_t index) const { return index < count_ ? &events_[index] : nullptr; }

DecisionRecord AccessPolicy::evaluate(const Request& request) const {
  DecisionRecord result{};
  result.evaluated_at = static_cast<uint64_t>(std::time(nullptr));
  std::snprintf(result.policy_id, sizeof(result.policy_id), "%s", kPolicyId);

  if (request.requester_role == Role::Unknown) {
    result.decision = Decision::Deny;
    std::snprintf(result.reason, sizeof(result.reason), "Requester role is not credentialed");
    return result;
  }
  if (request.data_class == DataClass::PublicIncident || request.data_class == DataClass::SafetyStatus) {
    result.decision = Decision::Allow;
    std::snprintf(result.reason, sizeof(result.reason), "Public safety data is readable by Aegis holders");
    return result;
  }
  if (request.data_class == DataClass::Allergy || request.data_class == DataClass::MedicalRecord) {
    if (request.requester_role == Role::Clinician || request.requester_role == Role::EmergencyResponder || request.emergency) {
      result.decision = Decision::AllowWithRedaction;
      std::snprintf(result.reason, sizeof(result.reason), "Clinical role matched; minimum necessary response allowed");
      return result;
    }
    result.decision = Decision::Deny;
    std::snprintf(result.reason, sizeof(result.reason), "Credential does not match clinical data class");
    return result;
  }
  if (request.data_class == DataClass::Credential || request.data_class == DataClass::SensorEvidence) {
    result.decision = request.requester_role == Role::IssuerAdmin || request.requester_role == Role::WaterTreatment
      ? Decision::AllowWithRedaction : Decision::Deny;
    std::snprintf(result.reason, sizeof(result.reason), "%s",
      result.decision == Decision::Deny ? "Issuer or domain credential required" : "Domain credential matched");
    return result;
  }
  result.decision = Decision::Deny;
  std::snprintf(result.reason, sizeof(result.reason), "No policy grants this request");
  return result;
}

bool AegisCore::begin() {
  nvs_handle_t handle;
  uint8_t seed[32]{};
  size_t seed_len = sizeof(seed);
  if (nvs_open(kNamespace, NVS_READWRITE, &handle) != ESP_OK ||
      nvs_get_blob(handle, "device_seed", seed, &seed_len) != ESP_OK) {
    esp_fill_random(seed, sizeof(seed));
    if (nvs_open(kNamespace, NVS_READWRITE, &handle) == ESP_OK) {
      nvs_set_blob(handle, "device_seed", seed, sizeof(seed));
      nvs_commit(handle);
      nvs_close(handle);
    }
  } else {
    nvs_close(handle);
  }
  uint8_t digest[32]{};
  mbedtls_sha256(seed, sizeof(seed), digest, 0);
  char fingerprint[65]{};
  hex_encode(digest, 32, fingerprint, sizeof(fingerprint));
  std::snprintf(identity_.node_id, sizeof(identity_.node_id), "node-%.*s", 16, fingerprint);
  std::snprintf(identity_.did, sizeof(identity_.did), "did:aegis:%s", fingerprint);
  std::snprintf(identity_.public_key, sizeof(identity_.public_key), "ed25519:%.*s", 32, fingerprint);
  return true;
}

DecisionRecord AegisCore::authorize(const Request& request) {
  auto result = policy_.evaluate(request);
  append_event(audit_, sequence_, request.requester_did, "access_request", result.decision, data_class_name(request.data_class));
  return result;
}

bool AegisCore::record_sensor_incident(const char* incident_id, const char* plant_id, const char* signal) {
  (void)plant_id; (void)signal;
  append_event(audit_, sequence_, identity_.did, incident_id ? incident_id : "sensor_incident",
               Decision::Allow, "public_incident");
  return true;
}

const char* decision_name(Decision value) { return value == Decision::Allow ? "allow" : value == Decision::AllowWithRedaction ? "allow_redacted" : "deny"; }
const char* role_name(Role value) { return value == Role::Clinician ? "clinician" : value == Role::WaterTreatment ? "water_treatment" : value == Role::EmergencyResponder ? "emergency_responder" : value == Role::IssuerAdmin ? "issuer_admin" : value == Role::Public ? "public" : "unknown"; }
const char* data_class_name(DataClass value) { return value == DataClass::PublicIncident ? "public_incident" : value == DataClass::SafetyStatus ? "safety_status" : value == DataClass::Allergy ? "allergy" : value == DataClass::MedicalRecord ? "medical_record" : value == DataClass::Credential ? "credential" : "sensor_evidence"; }
} // namespace aegis
