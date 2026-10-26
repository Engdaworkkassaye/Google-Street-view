import { React, WidgetState, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import * as webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import type { IMConfig } from '../config'
import defaultMessages from './translations/default'

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [jimuMapView, setJimuMapView] = React.useState<JimuMapView>()
  const [streetViewUrl, setStreetViewUrl] = React.useState<string>()
  const [status, setStatus] = React.useState<string>()
  const mapWidgetId = props.useMapWidgetIds?.[0]
  const dataSourceId = props.useDataSources?.[0]?.dataSourceId
  const message = React.useCallback((id: keyof typeof defaultMessages): string => {
    return props.intl.formatMessage({ id, defaultMessage: defaultMessages[id] })
  }, [props.intl])

  React.useEffect(() => {
    const view = jimuMapView?.view
    if (!view || !dataSourceId || (props.state != null && props.state !== WidgetState.Opened)) {
      return
    }

    let cancelled = false
    let clickHandle: { remove: () => void } | undefined

    void jimuMapView.whenJimuMapViewLoaded().then(() => {
      if (cancelled) return

      clickHandle = view.on('click', (event) => {
        if (jimuMapView.isCached()) return
        setStreetViewUrl(undefined)

        const layerView = jimuMapView.getAllLoadedJimuLayerViews()
          .find((candidate) => candidate.layerDataSourceId === dataSourceId && candidate.isLoaded)

        if (!layerView) {
          setStatus(message('layerUnavailable'))
          return
        }

        let pendingWindow: Window | null = null
        try {
          pendingWindow = window.open('about:blank', '_blank')
        } catch (error) {
          console.error('Could not open Google Street View in a new tab.', error)
          setStatus(message('openFailed'))
          return
        }

        void view.hitTest(event, { include: [layerView.layer] }).then((result) => {
          const hitFeature = result.results.some((hit) => (
            hit.type === 'graphic' && hit.graphic.layer === layerView.layer
          ))

          if (!hitFeature) {
            pendingWindow?.close()
            setStatus(message('noFeature'))
            return
          }

          if (!event.mapPoint) {
            pendingWindow?.close()
            setStatus(message('locationUnavailable'))
            return
          }

          const point = event.mapPoint
          let geographicPoint: __esri.Point | null = null
          if (point.spatialReference?.isWGS84) {
            geographicPoint = point
          } else if (point.spatialReference?.isWebMercator) {
            geographicPoint = webMercatorUtils.webMercatorToGeographic(point) as __esri.Point
          }

          if (!geographicPoint) {
            pendingWindow?.close()
            setStatus(message('unsupportedSpatialReference'))
            return
          }

          const latitude = Number(geographicPoint.latitude.toFixed(6))
          const longitude = Number(geographicPoint.longitude.toFixed(6))
          const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${latitude},${longitude}`)}`
          setStreetViewUrl(url)

          if (pendingWindow) {
            pendingWindow.opener = null
            pendingWindow.location.replace(url)
            setStatus(message('streetViewOpened'))
          } else {
            setStatus(message('popupBlocked'))
          }
        }).catch((error: unknown) => {
          pendingWindow?.close()
          console.error('Could not check the clicked map location.', error)
          const detail = error instanceof Error ? error.message : 'Unknown error'
          setStatus(`${message('hitTestFailed')} ${detail}`)
        })
      })
    }).catch((error: unknown) => {
      if (cancelled) return
      console.error('Could not load the selected map view.', error)
      setStatus(message('mapLoadFailed'))
    })

    return () => {
      cancelled = true
      clickHandle?.remove()
    }
  }, [dataSourceId, jimuMapView, message, props.state])

  const helpText = !mapWidgetId
    ? message('selectMap')
    : !dataSourceId
      ? message('selectLayer')
      : message('clickFeature')

  return (
    <div className="jimu-widget p-3">
      <p>{helpText}</p>
      {status && <p role="status">{status}</p>}
      {streetViewUrl && (
        <a href={streetViewUrl} target="_blank" rel="noopener noreferrer">
          {message('openStreetView')}
        </a>
      )}
      {mapWidgetId && (
        <JimuMapViewComponent
          useMapWidgetId={mapWidgetId}
          onActiveViewChange={setJimuMapView}
        />
      )}
    </div>
  )
}

export default Widget
