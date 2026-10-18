idf_component_register(
  SRCS "main.cpp" "aegis_core.cpp" "aegis_mesh.cpp"
  INCLUDE_DIRS "."
  REQUIRES nvs_flash esp_wifi mbedtls driver
)
