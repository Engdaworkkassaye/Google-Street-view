# MnDOT Street View Widget for ArcGIS Experience Builder

A custom ArcGIS Experience Builder widget that opens Google Street View from a map click.

## Download

For ArcGIS Enterprise, build or obtain the ready-to-use package that matches your Enterprise version. Do not use **Code → Download ZIP**, because that archive contains the source code and is intended for developers who want to modify or rebuild the widget.

| ArcGIS Enterprise | Experience Builder Developer Edition used for the build |

| 12.1 | 1.20 |

See Esri's [Experience Builder release-version matrix](https://developers.arcgis.com/experience-builder/guide/release-versions/) for compatibility details.

> **Important:** Use the package built for your ArcGIS Enterprise version. An incompatible Experience Builder build can cause runtime errors.

## Features

- Click on the map to capture a point
- Convert clicked coordinates from **WGS84, Web Mercator, and other supported spatial references** to WGS84, including **UTM zone 15N**
- Open Google Street View for the clicked location in a new browser tab
- Show a marker on the clicked point
- Show a brief confirmation toast when a location is saved
- Configurable widget title
- Optional setting to center the map on the clicked point

Widget symbol: Google Street View.

## How It Works

When the widget is connected to a map:

1. The user clicks a point on the map.
2. The widget reads the clicked geometry.
3. The point is converted to WGS84 if needed.
4. A Google Street View URL is generated.
5. Google Street View opens in a new browser tab.
