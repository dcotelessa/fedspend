import { routes } from './app.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GeographicViewComponent } from './geographic-view/geographic-view.component';
import { AgencyListComponent } from './agency-list/agency-list.component';
import { AgencySpotlightComponent } from './agency-spotlight/agency-spotlight.component';
import { DisasterLensComponent } from './disaster-lens/disaster-lens.component';

describe('App Routes', () => {
  interface TestCase {
    name: string;
    path: string;
    expectedComponent: any;
  }

  const testTable: TestCase[] = [
    {
      name: 'root path maps to DashboardComponent',
      path: '',
      expectedComponent: DashboardComponent
    },
    {
      name: 'geography path maps to GeographicViewComponent',
      path: 'geography',
      expectedComponent: GeographicViewComponent
    },
    {
      name: 'agencies path maps to AgencyListComponent',
      path: 'agencies',
      expectedComponent: AgencyListComponent
    },
    {
      name: 'agencies/:id path maps to AgencySpotlightComponent',
      path: 'agencies/:id',
      expectedComponent: AgencySpotlightComponent
    },
    {
      name: 'disaster path maps to DisasterLensComponent',
      path: 'disaster',
      expectedComponent: DisasterLensComponent
    }
  ];

  it.each(testTable)('$name', ({ path, expectedComponent }) => {
    const route = routes.find(r => r.path === path);
    expect(route).toBeDefined();
    expect(route?.component).toBe(expectedComponent);
  });
});