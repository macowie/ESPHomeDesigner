import { makeSafeId } from '../../js/utils/export_helpers.js';

const entityId = (widget, key, fallback) =>
    String(widget[key] || fallback).trim();

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

const makeRowLambda = (sensorId, index, mode) => {
    const fields = mode === 'bus'
        ? `const char* route = item["rtdd"] | item["rt"] | "";
          const char* destination = item["des"] | item["rtdir"] | "";
          const char* countdown = item["prdctdn"] | "";
          bool delayed = item["dly"] | false;
          std::string result = std::string(route) + "  " + destination + "  " + countdown;
          if (delayed) result += "  DELAY";`
        : `const char* route = item["rt"] | "";
          const char* destination = item["destNm"] | "";
          const char* arrival = item["arrT"] | "";
          const char* delayFlag = item["isDly"] | "0";
          bool delayed = std::string(delayFlag) == "1";
          std::string timeText = arrival;
          if (timeText.size() >= 16) timeText = timeText.substr(11, 5);
          std::string result = std::string(route) + "  " + destination + "  " + timeText;
          if (delayed) result += "  DELAY";`;
    return `!lambda |-
      DynamicJsonDocument doc(4096);
      auto error = deserializeJson(doc, id(${sensorId}).state);
      if (error) return std::string("Waiting for data...");
      JsonArray rows = doc.as<JsonArray>();
      if (rows.size() <= ${index}) return std::string("");
      JsonObject item = rows[${index}].as<JsonObject>();
      ${fields}
      return result;`;
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
    const titleFont = getLVGLFont(font, titleSize, 700);
    const rowFont = getLVGLFont(font, rowSize, 400);
    const accent = convertColor(p.accent_color || '#2d8cff');
    const color = convertColor(p.text_color || 'theme_auto');
    const delayColor = convertColor(p.delay_color || '#e65b45');
    const half = Math.floor((widget.width || 600) / 2);
    const gap = 12;
    const sectionWidth = half - gap;
    const headerHeight = titleSize + 18;
    const rowHeight = Math.max(42, rowSize * 2 + 8);
    const buildSection = (x, title, sensorId, mode) => {
        const nodes = [{
            label: {
                x, y: 4, width: sectionWidth, height: headerHeight,
                text: quote(title), text_font: titleFont, text_color: accent
            }
        }];
        for (let i = 0; i < 3; i += 1) {
            nodes.push({
                label: {
                    x, y: headerHeight + 10 + i * rowHeight,
                    width: sectionWidth, height: rowHeight,
                    text: makeRowLambda(sensorId, i, mode),
                    text_font: rowFont, text_color: color,
                    long_mode: 'DOT'
                }
            });
        }
        return nodes;
    };
    const widgets = [
        ...buildSection(8, p.bus_title || 'BUS · Clark / Division', busId, 'bus'),
        ...buildSection(half + gap, p.train_title || 'TRAIN · Sox-35th', trainId, 'train')
    ];
    return {
        obj: {
            ...common,
            bg_color: p.background_color && p.background_color !== 'transparent'
                ? convertColor(p.background_color) : undefined,
            bg_opa: p.background_color && p.background_color !== 'transparent' ? 'cover' : 'transp',
            border_width: 0,
            widgets
        }
    };
};
