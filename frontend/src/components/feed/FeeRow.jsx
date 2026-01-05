
export default function FeedRow({ entity, delete_feed_entity_callback }) {
  return entity.tripUpdate ? <TripUpdateFeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /> : <ServiceAlertFeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />
}