import { React, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import defaultMessages from './translations/default'

const Setting = (props: AllWidgetSettingProps<IMConfig>) => {
  const message = (id: keyof typeof defaultMessages): string => {
    return props.intl.formatMessage({ id, defaultMessage: defaultMessages[id] })
  }

  const onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    props.onSettingChange({ id: props.id, useMapWidgetIds })
  }

  const onDataSourceChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({ id: props.id, useDataSources })
  }

  return (
    <div className="p-2">
      <SettingSection title={message('mapSection')}>
        <SettingRow>
          <MapWidgetSelector
            useMapWidgetIds={props.useMapWidgetIds}
            onSelect={onMapWidgetSelected}
          />
        </SettingRow>
      </SettingSection>
      <SettingSection title={message('layerSection')}>
        <SettingRow>
          <DataSourceSelector
            types={Immutable([DataSourceTypes.FeatureLayer])}
            useDataSources={props.useDataSources}
            useDataSourcesEnabled
            mustUseDataSource
            onChange={onDataSourceChange}
            widgetId={props.id}
            closeDataSourceListOnChange
          />
        </SettingRow>
        <p>{message('layerHelp')}</p>
      </SettingSection>
    </div>
  )
}

export default Setting
