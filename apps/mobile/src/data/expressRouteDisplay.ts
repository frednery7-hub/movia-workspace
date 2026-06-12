import type {
  ExpressRouteAvailability,
  ExpressRouteType,
} from './expressRoute';

export function getExpressRouteBadgeLabel(
  type: ExpressRouteType,
  availability: ExpressRouteAvailability,
  translate: (key: string) => string,
): string {
  if (availability === 'unknown') {
    return `${translate('expressRoute.label')} · ${translate('expressRoute.unknownSchedule')}`;
  }

  const typeLabel = translate(`expressRoute.${type}`);
  if (availability === 'inactive') {
    return `${typeLabel} · ${translate('expressRoute.inactiveSuffix')}`;
  }

  return typeLabel;
}
