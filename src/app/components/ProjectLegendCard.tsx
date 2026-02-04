import React, { useCallback, useMemo } from "react";
import { GpsPoint, Marker, PointMarker, Tag } from "@prisma/client";
import { Badge } from "primereact/badge";

export type PointMarkerWithTags = PointMarker & {
  tags?: Tag[];
  marker: Marker | undefined;
};

type TagGroup = {
  tags: Tag[];
  tagKey: string;
  items: PointMarkerWithTags[];
  subGroups?: TagGroup[];
};

type MarkerGroup = {
  markerId: number;
  marker: Marker;
  tagGroups: TagGroup[];
  totalItems: number;
};

interface LegendMenuProps {
  tags: Tag[];
  pointsMarkers: PointMarkerWithTags[];
  onSelectPosition: (pos: GpsPoint) => void;
  visibleGroups: Record<number, boolean>;
  setVisibleGroups: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  visibleTags: Record<number, boolean>;
  setVisibleTags: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

const PointMarkerItem = React.memo(
  ({
    item,
    enabled,
    onSelectPosition,
  }: {
    item: PointMarkerWithTags;
    enabled: boolean;
    onSelectPosition: (pos: GpsPoint) => void;
  }) => {
    return (
      <div
        className={`ml-6 p-2 hover:bg-gray-100 rounded cursor-pointer text-sm ${
          !enabled ? "opacity-50 pointer-events-none" : ""
        }`}
        onClick={() => enabled && onSelectPosition(item as any)}
      >
        <div>{item?.comment}</div>
        <div className="text-xs text-gray-500">
          Lat: {item.lat}
          <br />
          Lon: {item.lon}
        </div>
      </div>
    );
  },
);

PointMarkerItem.displayName = "PointMarkerItem";

const TagGroupItem = React.memo(
  ({
    tagGroup,
    enabled,
    onSelect,
    level = 0,
    visibleTags,
  }: {
    tagGroup: TagGroup;
    enabled: boolean;
    onSelect: (pos: GpsPoint) => void;
    level?: number;
    visibleTags: Record<number, boolean>;
  }) => {
    const [expanded, setExpanded] = React.useState(false);
    const hasSubGroups = tagGroup.subGroups && tagGroup.subGroups.length > 0;
    const hasDirectItems = tagGroup.items.length > 0;

    // Verificar si todos los tags del grupo están visibles
    const allTagsVisible = tagGroup.tags.every(
      (tag) => visibleTags[tag.id] !== false,
    );
    const isVisible = enabled && allTagsVisible;

    return (
      <div
        className={`${level > 0 ? "ml-4" : "ml-4"} border-l-2 border-gray-200 pl-3`}
      >
        <div
          className="flex items-center justify-between py-2 hover:bg-gray-50 cursor-pointer rounded px-2"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {tagGroup.tags.map((tag) => (
              <Badge
                key={tag.id}
                value={tag.name}
                style={{
                  backgroundColor: tag.color as string,
                  opacity: visibleTags[tag.id] !== false ? 1 : 0.3,
                }}
              />
            ))}
            {tagGroup.tags.length === 0 && (
              <Badge value="Sin tags" severity="secondary" />
            )}
          </div>

          {hasSubGroups && (
            <span className="text-xs text-gray-500">
              (+{tagGroup.subGroups!.length} subgrupos)
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            type="button"
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        {expanded && enabled && (
          <>
            {hasDirectItems &&
              tagGroup.items.map((item) => (
                <PointMarkerItem
                  key={item.id}
                  item={item}
                  enabled={isVisible}
                  onSelectPosition={onSelect}
                />
              ))}

            {hasSubGroups &&
              tagGroup.subGroups!.map((subGroup) => (
                <TagGroupItem
                  key={subGroup.tagKey}
                  tagGroup={subGroup}
                  enabled={enabled}
                  onSelect={onSelect}
                  level={level + 1}
                  visibleTags={visibleTags}
                />
              ))}
          </>
        )}
      </div>
    );
  },
);

TagGroupItem.displayName = "TagGroupItem";

const GroupMenuItem = React.memo(
  ({
    markerGroup,
    enabled,
    onToggle,
    onSelect,
    forceExpanded,
    visibleTags,
  }: {
    markerGroup: MarkerGroup;
    enabled: boolean;
    onToggle: () => void;
    onSelect: (pos: GpsPoint) => void;
    forceExpanded?: boolean;
    visibleTags: Record<number, boolean>;
  }) => {
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
      if (forceExpanded !== undefined) {
        setExpanded(forceExpanded);
      }
    }, [forceExpanded]);

    const toggleExpanded = React.useCallback(() => {
      setExpanded((v) => !v);
    }, []);

    return (
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-3 hover:bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 cursor-pointer"
            />
            {markerGroup.marker.name}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            type="button"
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        {expanded && enabled && (
          <div className="pl-8 pb-3">
            {markerGroup.tagGroups.length > 1 && (
              <div className="text-xs text-gray-500 mb-2">
                {markerGroup.tagGroups.length} grupos de tags
              </div>
            )}
            {markerGroup.tagGroups.map((tagGroup) => (
              <TagGroupItem
                key={tagGroup.tagKey}
                tagGroup={tagGroup}
                enabled={enabled}
                onSelect={onSelect}
                visibleTags={visibleTags}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

GroupMenuItem.displayName = "GroupMenuItem";

const LegendMenu: React.FC<LegendMenuProps> = ({
  tags,
  pointsMarkers,
  onSelectPosition,
  visibleGroups,
  setVisibleGroups,
  visibleTags,
  setVisibleTags,
}) => {
  const pointsWithTags = useMemo(() => {
    if (!tags?.length) return pointsMarkers;
    return pointsMarkers.map((pm) => ({
      ...pm,
      tags: pm.Tags?.map((tagId) => tags.find((t) => t.id === tagId)).filter(
        Boolean,
      ) as Tag[],
    }));
  }, [pointsMarkers, tags]);

  const markerGroups = useMemo(() => {
    const markerMap = new Map();

    // First, create all tag groups
    for (const item of pointsWithTags) {
      const markerId = item.markerId || 0;
      if (!markerMap.has(markerId)) {
        markerMap.set(markerId, []);
      }

      const sortedTags = (item.tags || []).sort((a, b) => a.id - b.id);
      const tagKey =
        sortedTags.length > 0
          ? sortedTags.map((t) => t.id).join("-")
          : "no-tags";

      const groups = markerMap.get(markerId)!;
      let existingGroup = groups.find((g: TagGroup) => g.tagKey === tagKey);

      if (!existingGroup) {
        existingGroup = {
          tags: sortedTags,
          tagKey,
          items: [],
          subGroups: [],
        };
        groups.push(existingGroup);
      }

      existingGroup.items.push(item);
    }

    // Now build hierarchy: groups with fewer tags go inside groups with more tags (if subset)
    const result: MarkerGroup[] = [];

    for (const [markerId, allGroups] of markerMap.entries()) {
      const firstItem = allGroups[0]?.items[0];
      if (!firstItem?.marker) continue;

      // Sort by tag count descending (more tags first)
      const sortedGroups = [...allGroups].sort((a: TagGroup, b: TagGroup) => {
        if (a.tags.length === 0 && b.tags.length > 0) return 1;
        if (a.tags.length > 0 && b.tags.length === 0) return -1;
        return b.tags.length - a.tags.length;
      });

      // Build hierarchy
      const topLevelGroups: TagGroup[] = [];
      const processedKeys = new Set<string>();

      for (const group of sortedGroups) {
        if (processedKeys.has(group.tagKey)) continue;

        // Check if this group is a subset of any larger group
        let isSubset = false;
        for (const potentialParent of sortedGroups) {
          if (
            potentialParent.tagKey === group.tagKey ||
            potentialParent.tags.length <= group.tags.length
          ) {
            continue;
          }

          // Check if all tags in current group are in potential parent
          const parentTagIds = new Set(
            potentialParent.tags.map((t: any) => t.id),
          );
          const isSubsetOfParent = group.tags.every((tag: any) =>
            parentTagIds.has(tag.id),
          );

          if (isSubsetOfParent) {
            // Add as subgroup
            if (!potentialParent.subGroups) {
              potentialParent.subGroups = [];
            }
            potentialParent.subGroups.push(group);
            processedKeys.add(group.tagKey);
            isSubset = true;
            break;
          }
        }

        if (!isSubset) {
          topLevelGroups.push(group);
          processedKeys.add(group.tagKey);
        }
      }

      result.push({
        markerId,
        marker: firstItem.marker,
        tagGroups: topLevelGroups,
        totalItems: allGroups.reduce(
          (sum: number, tg: TagGroup) => sum + tg.items.length,
          0,
        ),
      });
    }

    return result;
  }, [pointsWithTags]);

  React.useEffect(() => {
    if (markerGroups.length > 0) {
      setVisibleGroups((prev) => {
        if (Object.keys(prev).length === 0) {
          return Object.fromEntries(
            markerGroups.map((g) => [g.markerId, true]),
          );
        }
        return prev;
      });
    }
  }, [markerGroups, setVisibleGroups]);

  const toggleGroup = useCallback(
    (markerId: number) => {
      setVisibleGroups((prev) => ({
        ...prev,
        [markerId]: !prev[markerId],
      }));
    },
    [setVisibleGroups],
  );

  const allVisible = useMemo(
    () =>
      markerGroups.length > 0 &&
      markerGroups.every((g) => visibleGroups[g.markerId]),
    [markerGroups, visibleGroups],
  );

  const toggleAll = () => {
    const newState = !allVisible;
    setVisibleGroups(
      Object.fromEntries(markerGroups.map((g) => [g.markerId, newState])),
    );
  };

  // Toggle individual de tags
  const toggleTag = (tagId: number) => {
    setVisibleTags((prev) => ({
      ...prev,
      [tagId]: !prev[tagId],
    }));
  };

  // Toggle todos los tags
  const allTagsVisible = useMemo(
    () => tags.length > 0 && tags.every((tag) => visibleTags[tag.id] !== false),
    [tags, visibleTags],
  );

  const toggleAllTags = () => {
    const newState = !allTagsVisible;
    setVisibleTags(Object.fromEntries(tags.map((tag) => [tag.id, newState])));
  };

  return (
    <div>
      {/* Sección de control de tags */}
      <div className="border-b-2 border-gray-300 pb-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Filtrar por Tags</h3>
          <button
            onClick={toggleAllTags}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {allTagsVisible ? "Ocultar todos" : "Mostrar todos"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={visibleTags[tag.id] !== false}
                onChange={() => toggleTag(tag.id)}
                className="w-4 h-4"
              />
              <Badge
                value={tag.name}
                style={{
                  backgroundColor: tag.color as string,
                  opacity: visibleTags[tag.id] !== false ? 1 : 0.3,
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Control de grupos de marcadores */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Grupos de Marcadores</h3>
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {allVisible ? "Cerrar todos los grupos" : "Abrir todos los grupos"}
        </button>
      </div>

      {markerGroups.map((markerGroup) => (
        <GroupMenuItem
          key={markerGroup.markerId}
          markerGroup={markerGroup}
          enabled={visibleGroups[markerGroup.markerId] ?? false}
          onToggle={() => toggleGroup(markerGroup.markerId)}
          onSelect={onSelectPosition}
          forceExpanded={visibleGroups[markerGroup.markerId] ?? false}
          visibleTags={visibleTags}
        />
      ))}
    </div>
  );
};

export default LegendMenu;
