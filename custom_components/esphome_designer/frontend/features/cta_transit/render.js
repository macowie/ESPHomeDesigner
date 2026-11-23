import { AppState } from '@core/state';

const asArray = (value) => {
    if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { return []; }
    }
    return Array.isArray(value) ? value : [];
};

const minutesUntil = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Math.max(0, Math.round((date.getTime() - Date.now()) / 60000));
};

const busCountdown = (item) => {
    const value = String(item.prdctdn ?? '').trim();
    if (value.toUpperCase() === 'DUE') return 'DUE';
    if (/^\d+$/.test(value)) return `${value} min`;
    return value || '—';
};

const trainCountdown = (item) => {
    const minutes = minutesUntil(item.arrT || item.prdt);
    if (minutes !== null) return minutes === 0 ? 'DUE' : `${minutes} min`;
    return item.isApp === '1' || item.isApp === true ? 'APPROACHING' : '—';
};

const getItems = (entityId, attribute) => {
    const entity = AppState?.entityStates?.[entityId];
    return asArray(entity?.attributes?.[attribute]).slice(0, 3);
};

const make = (tag, styles = {}, text = '') => {
    const node = document.createElement(tag);
    Object.assign(node.style, styles);
    node.textContent = text;
    return node;
};

export const render = (el, widget, { getColorStyle }) => {
    const p = widget.props || {};
    const width = widget.width || 600;
    const height = widget.height || 360;
    const text = getColorStyle(p.text_color || 'theme_auto');
    const accent = getColorStyle(p.accent_color || '#2d8cff');
    const delay = getColorStyle(p.delay_color || '#e65b45');
    el.innerHTML = '';
    Object.assign(el.style, {
        width: `${width}px`, height: `${height}px`, boxSizing: 'border-box',
        padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '14px', color: text, background: p.background_color || 'transparent',
        overflow: 'hidden', fontFamily: p.font_family || 'Roboto, sans-serif'
    });

    const drawSection = (title, items, kind) => {
        const section = make('section', {
            minWidth: '0', border: `1px solid ${accent}`, borderRadius: '10px',
            padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px'
        });
        section.appendChild(make('div', {
            fontSize: `${p.title_font_size || 22}px`, fontWeight: '700',
            borderBottom: `2px solid ${accent}`, paddingBottom: '8px'
        }, title));
        if (!items.length) {
            section.appendChild(make('div', { opacity: '.65', fontSize: '16px' }, 'Waiting for Home Assistant data…'));
        }
        items.forEach((item, index) => {
            const row = make('div', {
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto',
                alignItems: 'center', gap: '8px', padding: '7px 0',
                borderBottom: index < items.length - 1 ? '1px solid #8885' : 'none'
            });
            const route = kind === 'bus' ? (item.rtdd || item.rt || '') : (item.rt || '');
            const destination = kind === 'bus' ? (item.des || item.rtdir || 'Unknown destination') : (item.destNm || 'Unknown destination');
            const delayed = kind === 'bus'
                ? item.dly === true || item.dly === 'true' || item.dly === 1
                : item.isDly === '1' || item.isDly === 1 || item.isDly === true;
            const left = make('div', { minWidth: '0' });
            left.appendChild(make('div', { fontSize: '13px', fontWeight: '700', color: accent }, route ? `ROUTE ${route}` : `#${index + 1}`));
            left.appendChild(make('div', {
                fontSize: `${p.row_font_size || 18}px`, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }, destination));
            if (delayed) left.appendChild(make('div', { fontSize: '12px', fontWeight: '700', color: delay }, 'DELAYED'));
            row.appendChild(left);
            row.appendChild(make('div', {
                fontSize: `${p.countdown_font_size || 24}px`, fontWeight: '700',
                whiteSpace: 'nowrap', color: delayed ? delay : text
            }, kind === 'bus' ? busCountdown(item) : trainCountdown(item)));
            section.appendChild(row);
        });
        return section;
    };

    const busId = (widget.entity_id || 'sensor.cta_bus_clark_division_sb').trim();
    const trainId = (widget.entity_id_2 || 'sensor.cta_train_sox35th').trim();
    el.appendChild(drawSection(p.bus_title || 'BUS', getItems(busId, 'prd'), 'bus'));
    el.appendChild(drawSection(p.train_title || 'TRAIN', getItems(trainId, 'eta'), 'train'));
};
