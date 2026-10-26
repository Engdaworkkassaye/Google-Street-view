# Google Street View by Layer

This widget opens Google Street View in a new tab when a user clicks a feature from a configured feature layer on a configured map.

## Configuration

In the Experience Builder setting panel:

1. Select the map widget to use.
2. Select the feature-layer data source that contains the features users can click.

The selected feature layer must be present in the selected map. Clicks on other layers or empty map areas do not open Street View.

## Runtime behavior

The widget checks map clicks against the selected feature layer, converts the clicked map location from WGS84 or Web Mercator to latitude/longitude, and opens Google's public Maps URL with the Street View action. No Google API key is required. If the browser blocks the new tab, the widget displays a link that can be opened directly.

Street View imagery availability varies by location. Other spatial references are not currently supported.
