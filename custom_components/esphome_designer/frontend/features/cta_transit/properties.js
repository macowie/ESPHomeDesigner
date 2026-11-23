import { AppState } from '@core/state';

export const renderProperties = (panel, widget) => {
    const p = widget.props || {};
    const update = (key, value) => AppState.updateWidget(widget.id, {
        props: { ...widget.props, [key]: value }
    });
    const setText = (key) => (value) => update(key, String(value));
    const setNumber = (key) => (value) => update(key, Math.max(1, parseInt(String(value), 10) || 1));

    panel.createSection('Home Assistant Sensors', true);
    panel.addLabeledInputWithPicker('CTA Bus Entity', 'text',
        widget.entity_id || 'sensor.cta_bus_clark_division_sb',
        (value) => AppState.updateWidget(widget.id, { entity_id: value }), widget);
    panel.addHint('Reads the entity’s prd attribute. The attribute must contain the CTA prediction array.');
    panel.addLabeledInputWithPicker('CTA Train Entity', 'text',
        widget.entity_id_2 || 'sensor.cta_train_sox35th',
        (value) => AppState.updateWidget(widget.id, { entity_id_2: value }), widget,
        { skipAutoUpdate: true });
    panel.addHint('Reads the entity’s eta attribute. No CTA API calls or Home Assistant template sensors are created.');
    panel.endSection();

    panel.createSection('Section Labels', true);
    panel.addLabeledInput('Bus Heading', 'text', p.bus_title || 'BUS · Clark / Division', setText('bus_title'));
    panel.addLabeledInput('Train Heading', 'text', p.train_title || 'TRAIN · Sox-35th', setText('train_title'));
    panel.endSection();

    panel.createSection('Appearance', true);
    panel.addColorSelector('Text Color', p.text_color || 'theme_auto', null, setText('text_color'));
    panel.addColorSelector('Accent Color', p.accent_color || '#2d8cff', null, setText('accent_color'));
    panel.addColorSelector('Delay Color', p.delay_color || '#e65b45', null, setText('delay_color'));
    panel.addColorSelector('Background', p.background_color || 'transparent', null, setText('background_color'));
    panel.addLabeledInput('Heading Size', 'number', p.title_font_size || 22, setNumber('title_font_size'));
    panel.addLabeledInput('Destination Size', 'number', p.row_font_size || 18, setNumber('row_font_size'));
    panel.addLabeledInput('Countdown Size', 'number', p.countdown_font_size || 24, setNumber('countdown_font_size'));
    panel.endSection();
};
