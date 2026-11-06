#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_system.h"
#include "driver/gpio.h"
#include "nvs_flash.h"
#include "bsp/device.h"
#include "aegis_core.h"
#include "pax_gfx.h"
#include "pax_fonts.h"

#define SCREEN_WIDTH 800
#define SCREEN_HEIGHT 480
#define HEADER_HEIGHT 54
#define NAV_HEIGHT 58
#define PANEL_X 28
#define PANEL_Y 78
#define PANEL_W 744
#define PANEL_H 310

static const char *TAG = "aegis";
static pax_buf_t framebuffer;
static size_t display_width;
static size_t display_height;
static lcd_color_rgb_pixel_format_t display_format;
static lcd_rgb_data_endian_t display_endian;
static QueueHandle_t input_event_queue;

static void blit(void) {
    bsp_display_blit(0, 0, display_width, display_height, pax_buf_get_pixels(&framebuffer));
}

typedef enum {
    SCREEN_HOME,
    SCREEN_IDENTITY,
    SCREEN_CREDENTIALS,
    SCREEN_WALLET,
    SCREEN_MESH,
    SCREEN_FIELD,
    SCREEN_VERIFY,
    SCREEN_DOCUMENTS,
} aegis_screen_t;

typedef struct {
    const char *name;
    bool signature_present;
    bool issuer_match;
    bool date_valid;
    uint8_t public_comparison_count;
} local_document_t;

typedef struct {
    aegis_screen_t screen;
    uint8_t selected;
    uint8_t trust;
    bool simulation;
} aegis_state_t;

static const local_document_t local_document = {
    .name = "FIELD ACCESS PASS",
    .signature_present = true,
    .issuer_match = true,
    .date_valid = true,
    .public_comparison_count = 2,
};

static uint8_t advisory_document_score(const local_document_t *document) {
    uint8_t score = 0;
    if (document->signature_present) score += 35;
    if (document->issuer_match) score += 30;
    if (document->date_valid) score += 20;
    if (document->public_comparison_count > 0) score += 15;
    return score;
}

static aegis_state_t state = {
    .screen = SCREEN_HOME,
    .selected = 0,
    .trust = 94,
    .simulation = true,
};

static void fill(uint16_t color) { pax_background(&framebuffer, color); }
static void text(const char *value, int x, int y, int size, uint16_t color) {
    pax_draw_text(&framebuffer, &pax_font_saira_regular, (float) size, (float) x, (float) y, color, value);
}
static void rect(int x, int y, int w, int h, uint16_t color) {
    pax_draw_rect(&framebuffer, color, (float) x, (float) y, (float) w, (float) h);
}
static void outline(int x, int y, int w, int h, uint16_t color) {
    pax_draw_line(&framebuffer, color, x, y, x + w, y);
    pax_draw_line(&framebuffer, color, x + w, y, x + w, y + h);
    pax_draw_line(&framebuffer, color, x + w, y + h, x, y + h);
    pax_draw_line(&framebuffer, color, x, y + h, x, y);
}

static void draw_header(const char *title) {
    rect(0, 0, SCREEN_WIDTH, HEADER_HEIGHT, 0x102033);
    text("GRIMOIR", 28, 16, 22, 0xD7F7FF);
    text(title, 148, 19, 14, 0x8BA8B7);
    text(state.simulation ? "SIMULATION" : "LIVE", 626, 19, 12, 0xF6C76B);
    rect(746, 19, 10, 10, 0x4ADE80);
    text("ONLINE", 764, 19, 12, 0x8BA8B7);
}

static void draw_nav(void) {
    rect(0, SCREEN_HEIGHT - NAV_HEIGHT, SCREEN_WIDTH, NAV_HEIGHT, 0x0D1723);
    const char *labels[] = {"HOME", "PASS", "MESH", "FIELD", "VERIFY"};
    const int xs[] = {48, 196, 348, 504, 672};
    for (int i = 0; i < 5; i++) {
        uint16_t color = (state.screen == i || (i == 1 && state.screen == SCREEN_IDENTITY) || (i == 4 && state.screen == SCREEN_CREDENTIALS)) ? 0x6EE7F2 : 0x71889A;
        text(labels[i], xs[i], SCREEN_HEIGHT - 34, 12, color);
    }
}

static void draw_home(void) {
    draw_header("FIELD IDENTITY CONSOLE");
    text("Good evening, operator.", PANEL_X, 88, 28, 0xE6F7FA);
    text("Your device is ready for field work.", PANEL_X, 120, 14, 0x8099A8);
    rect(PANEL_X, 164, 360, 128, 0x142738);
    text("DEVICE TRUST", PANEL_X + 20, 184, 12, 0x84A1B1);
    text("94", PANEL_X + 20, 208, 46, 0x6EE7F2);
    text("/ 100", PANEL_X + 86, 232, 14, 0x829BA8);
    rect(PANEL_X + 20, 270, 310, 6, 0x253B4B);
    rect(PANEL_X + 20, 270, 292, 6, 0x6EE7F2);
    rect(420, 164, 352, 128, 0x142738);
    text("MESH STATUS", 440, 184, 12, 0x84A1B1);
    text("12", 440, 208, 38, 0xE6F7FA);
    text("peers connected", 490, 229, 14, 0x829BA8);
    text("LAST SYNC  2 min ago", 440, 261, 12, 0x6EE7F2);
    text("A", PANEL_X, 342, 16, 0x6EE7F2);
    text("Press ENTER to open identity passport", PANEL_X + 28, 342, 14, 0xB4CAD2);
    draw_nav();
}

static void draw_list(const char *title, const char *subtitle, const char *items[], int count) {
    draw_header(title);
    text(subtitle, PANEL_X, 88, 14, 0x8099A8);
    for (int i = 0; i < count; i++) {
        int y = 124 + i * 56;
        uint16_t bg = (i == state.selected) ? 0x1A3948 : 0x142738;
        rect(PANEL_X, y, PANEL_W, 42, bg);
        text(items[i], PANEL_X + 18, y + 13, 15, i == state.selected ? 0xE6F7FA : 0xB4CAD2);
        text(i == state.selected ? "ENTER" : "", PANEL_X + 650, y + 13, 11, 0x6EE7F2);
    }
    draw_nav();
}

static void draw_screen(void) {
    fill(0x08121C);
    switch (state.screen) {
        case SCREEN_HOME: draw_home(); break;
        case SCREEN_IDENTITY: {
            const char *items[] = {"IDENTITY PASSPORT", "CREDENTIALS", "WALLET / BALANCE"};
            draw_list("IDENTITY", "Device-bound identity and credentials", items, 3);
            break;
        }
        case SCREEN_CREDENTIALS: {
            const char *items[] = {"FIELD OPERATOR / VERIFIED", "MEDICAL RESPONDER / ACTIVE", "ACCESS LEVEL 03 / VALID"};
            draw_list("CREDENTIALS", "Signed credentials available offline", items, 3);
            break;
        }
        case SCREEN_WALLET: {
            const char *items[] = {"FIELD CREDIT", "RELAY TOKENS", "RECENT ACTIVITY"};
            draw_list("WALLET", "Local demo wallet", items, 3);
            break;
        }
        case SCREEN_MESH: {
            const char *items[] = {"12 PEERS / HEALTHY", "NORTH RELAY / 86%", "SOUTH RELAY / 72%", "SYNC NOW"};
            draw_list("MESH", "Encrypted peer network overview", items, 4);
            break;
        }
        case SCREEN_FIELD: {
            const char *items[] = {"REPORT 042 / MEDICAL", "REPORT 041 / SUPPLY", "REPORT 039 / ROUTE", "CREATE FIELD REPORT"};
            draw_list("FIELD REPORTS", "Offline-first incident records", items, 4);
            break;
        }
        case SCREEN_VERIFY: {
            const char *items[] = {"SCAN CREDENTIAL", "VERIFY SIGNATURE", "DOCUMENT TRUST", "CLEAR SESSION"};
            draw_list("VERIFICATION", "Local verification console", items, 4);
            break;
        }
        case SCREEN_DOCUMENTS: {
            uint8_t score = advisory_document_score(&local_document);
            draw_header("DOCUMENT TRUST");
            text("ADVISORY / ON-DEVICE ONLY", PANEL_X, 88, 14, 0xF6C76B);
            text(local_document.name, PANEL_X, 126, 24, 0xE6F7FA);
            text("TRUST SCORE", PANEL_X, 178, 12, 0x84A1B1);
            char score_text[8];
            snprintf(score_text, sizeof(score_text), "%u / 100", score);
            text(score_text, PANEL_X, 198, 32, 0x6EE7F2);
            text("Signature present", PANEL_X, 260, 14, 0xB4CAD2);
            text(local_document.signature_present ? "YES" : "NO", 310, 260, 14, 0x6EE7F2);
            text("Issuer/date checks", PANEL_X, 288, 14, 0xB4CAD2);
            text((local_document.issuer_match && local_document.date_valid) ? "PASS" : "REVIEW", 310, 288, 14, 0x6EE7F2);
            text("Public comparisons", PANEL_X, 316, 14, 0xB4CAD2);
            text("2 local references", 310, 316, 14, 0x6EE7F2);
            text("Not proof of authenticity. Verify through an authorized issuer.", PANEL_X, 376, 12, 0xF6C76B);
            draw_nav();
            break;
        }
    }
}

static void handle_input(void) {
    // Template projects map the Tanmatsu keyboard into this small event layer.
    // The demo keeps a conservative GPIO fallback for bring-up: GPIO 0 = select,
    // GPIO 1 = back. Replace with the template's pax_input queue on hardware.
    if (gpio_get_level(GPIO_NUM_0) == 0) {
        state.screen = (state.screen == SCREEN_HOME) ? SCREEN_IDENTITY : state.screen;
        state.selected = 0;
        vTaskDelay(pdMS_TO_TICKS(180));
    }
    if (gpio_get_level(GPIO_NUM_1) == 0) {
        state.screen = SCREEN_HOME;
        state.selected = 0;
        vTaskDelay(pdMS_TO_TICKS(180));
    }
}

void app_main(void) {
    ESP_LOGI(TAG, "Starting The Grimoir standalone firmware");
    ESP_LOGW(TAG, "SIMULATION mode: identity, mesh, and verification are not cryptographic");

    esp_err_t nvs_result = nvs_flash_init();
    if (nvs_result == ESP_ERR_NVS_NO_FREE_PAGES || nvs_result == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        nvs_result = nvs_flash_init();
    }
    ESP_ERROR_CHECK(nvs_result);

    aegis::AegisCore identity_core;
    if (!identity_core.begin()) {
        ESP_LOGE(TAG, "Aegis identity initialization failed");
        return;
    }
    ESP_LOGI(TAG, "Aegis node online: %s", identity_core.identity().node_id);

    const bsp_configuration_t bsp_configuration = {
        .display = {
            .requested_color_format = LCD_COLOR_PIXEL_FORMAT_RGB565,
            .num_fbs = 1,
        },
    };
    ESP_ERROR_CHECK(bsp_device_initialize(&bsp_configuration));
    ESP_ERROR_CHECK(bsp_display_get_parameters(&display_width, &display_height, &display_format, &display_endian));
    ESP_ERROR_CHECK(bsp_input_get_queue(&input_event_queue));

    pax_buf_type_t buffer_type = display_format == LCD_COLOR_PIXEL_FORMAT_RGB888
        ? PAX_BUF_24_888RGB
        : PAX_BUF_16_565;
    pax_buf_init(&framebuffer, NULL, display_width, display_height, buffer_type);
    pax_buf_reversed(&framebuffer, display_endian == LCD_RGB_DATA_ENDIAN_BIG);

    gpio_set_direction(GPIO_NUM_0, GPIO_MODE_INPUT);
    gpio_set_direction(GPIO_NUM_1, GPIO_MODE_INPUT);
    draw_screen();
    blit();
    while (true) {
        handle_input();
        draw_screen();
        blit();
        vTaskDelay(pdMS_TO_TICKS(33));
    }
}
