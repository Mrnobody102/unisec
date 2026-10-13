import type { GuideContent } from './index';

export const en: GuideContent = {
  title: 'User guide',
  topicsLabel: 'Topics',
  close: 'Close guide',
  fullImage: 'View the full guide image',
  previous: 'Previous topic',
  next: 'Next topic',
  stepOf: 'Topic {n} of {total}',
  topics: [
    {
      id: 'response',
      audience: 'manager',
      title: 'Read the situation',
      image: 'guide/response.jpg',
      steps: [
        {
          icon: 'history',
          title: 'Area and data revision',
          text: 'Click the area name in the header for the incident, data sources and update history. The timestamp identifies the data in use; it is not a live clock.'
        },
        {
          icon: 'people',
          title: 'Pick a community',
          text: 'In the Incident tab, choose a priority community to open its access options.'
        },
        {
          icon: 'route',
          title: 'Compare routes',
          text: 'Select each route to see its length, travel time and path on the map.'
        },
        {
          icon: 'blocked',
          title: 'Inspect problem sections',
          text: 'Open a section under Route sections to see field reports and the elevation profile.'
        },
        {
          icon: 'bell',
          title: 'Apply new reports',
          text: 'Open the notification bell, read the report and choose Update map to use it.'
        }
      ]
    },
    {
      id: 'reports',
      audience: 'manager',
      title: 'Photos and report review',
      image: 'guide/reports.jpg',
      steps: [
        {
          icon: 'image',
          title: 'Read incoming reports',
          text: 'Click Reports in the header. Select a report to inspect its photos and location; click a photo to enlarge it.'
        },
        {
          icon: 'location',
          title: 'Check the source',
          text: 'Compare report coordinates and capture time. Available image metadata fills the form automatically; expand image parameters for further checks.'
        },
        {
          icon: 'check',
          title: 'Save the review',
          text: 'Under Review report, choose a Result, add a note if needed, and save. Reviewing a report does not automatically establish road safety or change the access assessment.'
        },
        {
          icon: 'area',
          title: 'Add a photo and affected area',
          text: 'In GIS, select a point and Add field observation to attach your photos. Draw a suspected affected area linked to the point, keeping its verification status clear.'
        }
      ]
    },
    {
      id: 'map',
      audience: 'manager',
      title: 'Map and journeys',
      image: 'guide/map.jpg',
      steps: [
        {
          icon: 'route',
          title: 'Journey between two points',
          text: 'Pick A and B from the list, or press the location icon and click the map. Off-road points join the nearest road.'
        },
        {
          icon: 'layers',
          title: 'Map layers',
          text: 'Switch between imagery and terrain basemaps and toggle data groups.'
        },
        {
          icon: 'ruler',
          title: 'Measure',
          text: 'Measure distances and areas on the 2D map.'
        },
        {
          icon: 'location',
          title: 'Identify',
          text: 'Click the map to read coordinates and elevation.'
        },
        {
          icon: 'fit',
          title: '2D and 3D',
          text: 'Switch modes at the right of the toolbar. In 3D, hold Ctrl and drag to tilt or rotate.'
        }
      ]
    },
    {
      id: 'gis',
      audience: 'manager',
      title: 'GIS data and photos',
      image: 'guide/gis.jpg',
      steps: [
        {
          icon: 'polygon',
          title: 'Open GIS',
          text: 'Press GIS on the map toolbar.'
        },
        {
          icon: 'plus',
          title: 'Import data',
          text: 'Drop KML, GeoJSON or WKT files on the import area, or paste coordinates.'
        },
        {
          icon: 'image',
          title: 'Grouped points',
          text: 'In Layers or GIS, choose Group nearby points to open their photos together, or Show original points to inspect each original coordinate.'
        },
        {
          icon: 'area',
          title: 'Observations and areas',
          text: 'Select a point to add an observation, photos and a suspected affected area.'
        }
      ]
    },
    {
      id: 'save',
      audience: 'manager',
      title: 'Save and export',
      image: 'guide/save.jpg',
      steps: [
        {
          icon: 'download',
          title: 'Save assessment',
          text: 'In a community panel, choose Save assessment to preview and export it.'
        },
        {
          icon: 'download',
          title: 'Export GIS data',
          text: 'In GIS, choose a scope under Export data and press GeoJSON or KML.'
        },
        {
          icon: 'settings',
          title: 'Settings',
          text: 'Change theme, font, language or reset the session.'
        },
        {
          icon: 'info',
          title: 'Back up',
          text: 'Data is stored in this browser. Export a copy before clearing browser data.'
        }
      ]
    },
    {
      id: 'residentRoads',
      audience: 'resident',
      title: 'Road information',
      image: 'guide/resident-roads.jpg',
      steps: [
        {
          icon: 'people',
          title: 'Choose an area',
          text: 'In Road information, choose where you want to go.'
        },
        {
          icon: 'blocked',
          title: 'Read the route',
          text: 'Red sections are blocked; orange sections need checking before you travel.'
        },
        {
          icon: 'route',
          title: 'Another journey',
          text: 'Set any start and end to see the distance along the road network.'
        }
      ]
    },
    {
      id: 'residentReport',
      audience: 'resident',
      title: 'Send photos and reports',
      image: 'guide/resident-report.jpg',
      steps: [
        {
          icon: 'image',
          title: 'Add photos',
          text: 'Drop or choose up to 3 photos. Location and capture time are read from the photos.'
        },
        {
          icon: 'location',
          title: 'Check the location',
          text: 'If it is wrong, use My location, pick on the map or enter coordinates.'
        },
        {
          icon: 'check',
          title: 'Send',
          text: 'Press Send report. It moves to the Sent tab.'
        }
      ]
    },
    {
      id: 'residentMine',
      audience: 'resident',
      title: 'Track your reports',
      image: 'guide/resident-mine.jpg',
      steps: [
        {
          icon: 'image',
          title: 'See the status',
          text: 'Each report shows Awaiting review, Reviewed or More information needed.'
        },
        {
          icon: 'edit',
          title: 'Add information',
          text: 'Open a report and choose Edit observation when more photos or details are needed.'
        }
      ]
    }
  ]
};
