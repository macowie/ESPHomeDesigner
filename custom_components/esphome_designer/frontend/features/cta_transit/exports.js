import { makeSafeId } from '../../js/utils/export_helpers.js';

const entityId = (widget, key, fallback) => String(widget[key] || fallback).trim();

export const onExportTextSensors = (context) => {
    const { lines, widgets, seenSensorIds } = context;
    const targets = [
        { key: 'entity_id', fallback: 'sensor.cta_bus_clark_division_sb', attribute: 'prd' },
        { key: 'entity_id_2', fallback: 'sensor.cta_train_sox35th', attribute: 'eta' }
    ];
    for (const widget of (widgets || []).filter((item) => item.type === 'cta_transit')) {
        for (const target of targets) {
            const entity = entityId(widget, target.key, target.fallback);
            if (!entity || !entity.includes('.')) continue;
            const safeId = makeSafeId(`cta_transit_${entity}_${target.attribute}`);
            if (seenSensorIds?.has(safeId)) continue;
            seenSensorIds?.add(safeId);
            lines.push('- platform: homeassistant');
            lines.push(`  id: ${safeId}`);
            lines.push(`  entity_id: ${entity}`);
            lines.push(`  attribute: ${target.attribute}`);
            lines.push('  internal: true');
        }
    }
};

const quote = (value) => JSON.stringify(String(value ?? ''));

const makeRowLambda = (sensorId, index, mode, field) => {
    let body = '';
    if (mode === 'bus' && field === 'left') {
        body = `const char* route = item["rtdd"] | item["rt"] | "";
      const char* destination = item["des"] | item["rtdir"] | "Unknown";
      bool delayed = item["dly"] | false;
      std::string result = std::string(route) + "  " + destination;
      if (delayed) result += "  DELAY";
      return result;`;
    } else if (mode === 'bus') {
        body = `const char* raw = item["prdctdn"] | "";
      std::string result = raw;
      if (result == "DUE") return result;
      if (!result.empty() && result.find("min") == std::string::npos) result += " min";
      return result.empty() ? std::string("--") : result;`;
    } else if (field === 'left') {
        body = `const char* route = item["rt"] | "";
      const char* destination = item["destNm"] | "Unknown";
      const char* delayed = item["isDly"] | "0";
      std::string result = std::string(route) + "  " + destination;
      if (std::string(delayed) == "1") result += "  DELAY";
      return result;`;
    } else {
        body = `const char* arrival = item["arrT"] | item["prdt"] | "";
      if (strlen(arrival) < 16) return std::string("--");
      int arrival_hour = 0, arrival_minute = 0;
      if (sscanf(arrival + 11, "%2d:%2d", &arrival_hour, &arrival_minute) != 2) return std::string("--");
      auto now = id(ha_time).now();
      int remaining = arrival_hour * 60 + arrival_minute - (now.hour * 60 + now.minute);
      if (remaining < 0) remaining += 24 * 60;
      if (remaining == 0) return std::string("DUE");
      return std::to_string(remaining) + " min";`;
    }
    return `!lambda |-
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, id(${sensorId}).state);
      if (error) return std::string("Waiting...");
      JsonArray rows = doc.as<JsonArray>();
      if (rows.size() <= ${index}) return std::string("");
      JsonObject item = rows[${index}].as<JsonObject>();
      ${body}`;
};

export const exportLVGL = (widget, { common, convertColor, getLVGLFont }) => {
    const p = widget.props || {};
    const busEntity = entityId(widget, 'entity_id', 'sensor.cta_bus_clark_division_sb');
    const trainEntity = entityId(widget, 'entity_id_2', 'sensor.cta_train_sox35th');
    const busId = makeSafeId(`cta_transit_${busEntity}_prd`);
    const trainId = makeSafeId(`cta_transit_${trainEntity}_eta`);
    const font = p.font_family || 'Roboto';
    const titleSize = Math.max(12, parseInt(p.title_font_size || 22, 10));
    const rowSize = Math.max(10, parseInt(p.row_font_size || 18, 10));
    const countdownSize = Math.max(12, parseInt(p.countdown_font_size || 24, 10));
    const titleFont = getLVGLFont(font, titleSize, 700);
    const rowFont = getLVGLFont(font, rowSize, 400);
    const countdownFont = getLVGLFont(font, countdownSize, 700);
    const accent = convertColor(p.accent_color || '#2d8cff');
    const color = convertColor(p.text_color || 'theme_auto');
    const half = Math.floor((widget.width || 600) / 2);
    const gap = 12;
    const sectionWidth = half - gap;
    const headerHeight = titleSize + 18;
    const rowHeight = Math.max(44, countdownSize + 14);
    const buildSection = (x, title, sensorId, mode) => {
        const nodes = [{
            label: {
                x, y: 4, width: sectionWidth, height: headerHeight,
                text: quote(title), text_font: titleFont, text_color: accent
            }
        }];
        for (let i = 0; i < 3; i += 1) {
            const y = headerHeight + 10 + i * rowHeight;
            nodes.push({
                label: {
                    x, y, width: Math.round(sectionWidth * 0.68), height: rowHeight,
                    text: makeRowLambda(sensorId, i, mode, 'left'),
                    text_font: rowFont, text_color: color, long_mode: 'DOT'
                }
            });
            nodes.push({
                label: {
                    x: x + Math.round(sectionWidth * 0.68), y,
                    width: Math.round(sectionWidth * 0.32), height: rowHeight,
                    text: makeRowLambda(sensorId, i, mode, 'right'),
                    text_font: countdownFont, text_color: accent,
                    text_align: 'right', long_mode: 'DOT'
                }
            });
        }
        return nodes;
    };
    return {
        obj: {
            ...common,
            bg_color: p.background_color && p.background_color !== 'transparent'
                ? convertColor(p.background_color) : undefined,
            bg_opa: p.background_color && p.background_color !== 'transparent' ? 'cover' : 'transp',
            border_width: 0,
            widgets: [
                ...buildSection(8, p.bus_title || 'BUS · Clark / Division', busId, 'bus'),
                ...buildSection(half + gap, p.train_title || 'TRAIN · Sox-35th', trainId, 'train')
            ]
        }
    };
};
