idf_component_register(
    SRCS "main.cpp" "aegis_core.cpp" "aegis_mesh.cpp"
    INCLUDE_DIRS "."
    REQUIRES pax_code esp_lcd driver
)
