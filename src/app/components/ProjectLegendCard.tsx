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
        className={`flex flex-col gap-1 p-2 pl-4 rounded text-xs ${
          enabled
            ? "cursor-pointer hover:bg-gray-100"
            : "opacity-40 cursor-not-allowed"
        }`}
        onClick={() => enabled && onSelectPosition(item as any)}
      >
        <div className="flex items-center gap-2">
          <i className="pi pi-map-marker text-sm text-blue-500" />
          <span className="font-semibold">{item?.comment}</span>
        </div>
        <div className="ml-6 text-[11px] text-gray-600 leading-tight">
          <div>
            <span className="font-medium">Lat:</span> {item.lat}
          </div>
          <div>
            <span className="font-medium">Lon:</span> {item.lon}
          </div>
        </div>
      </div>
    );
  },
);

const TagGroupItem = React.memo(
  ({
    tagGroup,
    enabled,
    onSelect,
    level = 0,
  }: {
    tagGroup: TagGroup;
    enabled: boolean;
    onSelect: (pos: GpsPoint) => void;
    level?: number;
  }) => {
    const [expanded, setExpanded] = React.useState(false);

    const hasSubGroups = tagGroup.subGroups && tagGroup.subGroups.length > 0;
    const hasDirectItems = tagGroup.items.length > 0;

    return (
      <div
        className={`mb-2 ${level > 0 ? "ml-4" : "ml-4"} border-l-2 border-gray-200 pl-3`}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer select-none ${
            enabled ? "hover:bg-blue-50 bg-gray-50" : "opacity-50 bg-gray-100"
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1">
              {tagGroup.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `#${tag.color}20`,
                    border: `1px solid #${tag.color}`,
                    color: `#${tag.color}`,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: `#${tag.color}`,
                    }}
                  />
                  {tag.name}
                </span>
              ))}
              {tagGroup.tags.length === 0 && (
                <span className="text-xs text-gray-500 italic">Sin tags</span>
              )}
            </div>
            <Badge value={tagGroup.items.length} severity="info" />
            {hasSubGroups && (
              <span className="text-[10px] text-gray-500">
                (+{tagGroup.subGroups!.length} subgrupos)
              </span>
            )}
          </div>
          <button
            className="text-sm font-bold px-2 py-0.5 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            type="button"
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        <div
          style={{
            maxHeight: expanded && enabled ? 2000 : 0,
            transition: "max-height 0.3s ease",
            overflow: "hidden",
          }}
        >
          {expanded && enabled && (
            <>
              {hasDirectItems &&
                tagGroup.items.map((item) => (
                  <PointMarkerItem
                    key={item.id}
                    item={item}
                    enabled={enabled}
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
                  />
                ))}
            </>
          )}
        </div>
      </div>
    );
  },
);

const GroupMenuItem = React.memo(
  ({
    markerGroup,
    enabled,
    onToggle,
    onSelect,
    forceExpanded,
  }: {
    markerGroup: MarkerGroup;
    enabled: boolean;
    onToggle: () => void;
    onSelect: (pos: GpsPoint) => void;
    forceExpanded?: boolean;
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
      <div
        className="mb-3 rounded-lg shadow-md border-2 border-gray-300 bg-white"
        style={{ overflow: "hidden" }}
      >
        <div
          className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none ${
            enabled ? "hover:bg-gray-50" : "opacity-50 bg-gray-100"
          }`}
          onClick={toggleExpanded}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 cursor-pointer"
            />
            <img
              src={markerGroup.marker.icon}
              alt={markerGroup.marker.name}
              className="w-6 h-6 object-contain"
            />
            <span className="font-bold text-base">
              {markerGroup.marker.name}
            </span>
            <Badge value={markerGroup.totalItems} severity="success" />
          </div>
          <button
            className="text-lg font-bold px-3 py-1 rounded-full border-2 border-gray-400 hover:bg-gray-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            type="button"
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        <div
          className="pb-3"
          style={{
            maxHeight: expanded && enabled ? 2000 : 0,
            transition: "max-height 0.4s ease",
            overflow: "hidden",
          }}
        >
          {expanded && enabled && (
            <div className="px-3 pt-2">
              {markerGroup.tagGroups.length > 1 && (
                <div className="mb-2 text-xs text-gray-600 px-3">
                  {markerGroup.tagGroups.length} grupos de tags
                </div>
              )}
              {markerGroup.tagGroups.map((tagGroup) => (
                <TagGroupItem
                  key={tagGroup.tagKey}
                  tagGroup={tagGroup}
                  enabled={enabled}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);

const LegendMenu: React.FC<LegendMenuProps> = ({
  tags,
  pointsMarkers,
  onSelectPosition,
  visibleGroups,
  setVisibleGroups,
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
    const markerMap = new Map<number, TagGroup[]>();

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
      let existingGroup = groups.find((g) => g.tagKey === tagKey);

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
      const sortedGroups = [...allGroups].sort((a, b) => {
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
          const parentTagIds = new Set(potentialParent.tags.map((t) => t.id));
          const isSubsetOfParent = group.tags.every((tag) =>
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
        totalItems: allGroups.reduce((sum, tg) => sum + tg.items.length, 0),
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

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <input
          type="checkbox"
          checked={allVisible}
          onChange={toggleAll}
          id="toggle-all-groups"
          className="w-5 h-5 cursor-pointer"
        />
        <label
          htmlFor="toggle-all-groups"
          className="select-none cursor-pointer font-medium"
        >
          {allVisible ? "Cerrar todos los grupos" : "Abrir todos los grupos"}
        </label>
      </div>

      {markerGroups.map((markerGroup) => (
        <GroupMenuItem
          key={markerGroup.markerId}
          markerGroup={markerGroup}
          enabled={visibleGroups[markerGroup.markerId] ?? false}
          onToggle={() => toggleGroup(markerGroup.markerId)}
          onSelect={onSelectPosition}
          forceExpanded={visibleGroups[markerGroup.markerId] ?? false}
        />
      ))}
    </div>
  );
};

export default LegendMenu;
