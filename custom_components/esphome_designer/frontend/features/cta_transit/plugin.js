import { render } from './render.js';
import { renderProperties } from './properties.js';
import { exportLVGL, onExportTextSensors } from './exports.js';

export default {
    id: 'cta_transit',
    name: 'CTA Transit',
    category: 'Custom',
    supportedModes: ['lvgl'],
    defaults: {
        entity_id: 'sensor.cta_bus_clark_division_sb',
        entity_id_2: 'sensor.cta_train_sox35th',
        bus_title: 'BUS · Clark / Division',
        train_title: 'TRAIN · Sox-35th',
        background_color: 'transparent',
        text_color: 'theme_auto',
        accent_color: '#2d8cff',
        delay_color: '#e65b45',
        font_family: 'Roboto',
        title_font_size: 22,
        row_font_size: 18,
        countdown_font_size: 24,
        row_gap: 8,
        width: 1280,
        height: 800
    },
    render,
    renderProperties,
    exportLVGL,
    onExportTextSensors
};
