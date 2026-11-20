import { css } from 'jimu-core'

const BRAND_COLOR = '#003865'

export const getStyle = () => {
  return css`
    .widget-street-view {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 100%;
      box-sizing: border-box;
    }

    .widget-street-view__panel {
      position: absolute;
      inset: 0;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
      overflow: hidden;
      background: #fff;
    }

    .widget-street-view__header {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 0;
      border-bottom: 3px solid ${BRAND_COLOR};
      padding-bottom: 10px;
    }

    .widget-street-view__title {
      font-weight: 700;
      font-size: 15px;
      color: ${BRAND_COLOR};
      letter-spacing: 0.2px;
    }

    .widget-street-view__hint {
      color: #666;
    }

    .widget-street-view__toolbar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .widget-street-view__toolbar button.jimu-btn[type='primary'],
    .widget-street-view__toolbar .jimu-btn.btn-primary {
      background-color: ${BRAND_COLOR};
      border-color: ${BRAND_COLOR};
    }

    .widget-street-view__map-connection {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      pointer-events: none;
    }
  `
}
