"use client";

import { GpsPoint, Tag } from "@prisma/client";
import { useState } from "react";
import LegendMenu, { PointMarkerWithTags } from "./ProjectLegendCard";

interface LegendMenuProps {
  tags: Tag[];
  pointsMarkers: PointMarkerWithTags[];
  visibleGroups: Record<number, boolean>;
  onSelectPosition: (pos: GpsPoint) => void;
  setVisibleGroups: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  visibleTags: Record<number, boolean>;
  setVisibleTags: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export default function SidebarLegend({
  tags,
  pointsMarkers,
  visibleGroups,
  onSelectPosition,
  setVisibleGroups,
  visibleTags,
  setVisibleTags,
}: LegendMenuProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full h-full">
      <div className="p-1 overflow-auto h-full">
        <LegendMenu
          tags={tags}
          pointsMarkers={pointsMarkers}
          onSelectPosition={onSelectPosition}
          visibleGroups={visibleGroups}
          setVisibleGroups={setVisibleGroups}
          visibleTags={visibleTags}
          setVisibleTags={setVisibleTags}
        />
      </div>
    </div>
  );
}
