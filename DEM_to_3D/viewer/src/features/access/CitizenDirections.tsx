import type { Community, Locale } from "../../types/dear";
import type { useRoadJourney } from "../routes/useRoadJourney";
import { roadProjected } from "../routes/selectedRoadJourney";
import type { useDeviceLocation } from "../../shared/hooks/useDeviceLocation";
export function CitizenDirections({
  journey,
  communities,
  locale,
  gps,
  onPick,
  onMap,
}: {
  journey: ReturnType<typeof useRoadJourney>;
  communities: Community[];
  locale: Locale;
  gps: ReturnType<typeof useDeviceLocation>;
  onPick: (side: "start" | "end") => void;
  onMap: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const choose = (side: "start" | "end", key: string) => {
    gps.cancel();
    journey.setOpen(true);
    if (!key) {
      journey.clear(side);
      return;
    }
    const c = communities.find((c) => "community:" + c.id === key);
    if (c) journey.setPoint(side, c.projected, key, c.name);
  };
  return (
    <section className="citizen-directions">
      <h2>{t("Tìm đường", "Find a route")}</h2>
      {(["start", "end"] as const).map((side) => (
        <label key={side} className="geodata-field">
          {side === "start"
            ? t("Đi từ đâu?", "Starting point")
            : t("Đến đâu?", "Destination")}
          <select
            value={journey[side]?.source ?? ""}
            onChange={(e) => choose(side, e.target.value)}
          >
            <option value="">
              {side === "start"
                ? t("Chọn nơi xuất phát", "Choose starting point")
                : t("Chọn nơi đến", "Choose destination")}
            </option>
            {journey[side]?.source === "device" && (
              <option value="device">
                {t("Vị trí hiện tại", "Current location")}
              </option>
            )}
            {journey[side]?.source === "map" && (
              <option value="map">
                {t("Vị trí trên bản đồ", "Location on map")}
              </option>
            )}
            {communities.map((c) => (
              <option key={c.id} value={"community:" + c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              journey.setOpen(true);
              onPick(side);
            }}
          >
            {t("Chọn trên bản đồ", "Choose on map")}
          </button>
        </label>
      ))}
      <button
        type="button"
        className="button"
        disabled={gps.busy}
        onClick={async () => {
          const p = await gps.request();
          if (p) {
            journey.setOpen(true);
            journey.setPoint(
              "start",
              roadProjected(p.latitude, p.longitude),
              "device",
              t("Vị trí hiện tại", "Current location"),
            );
          }
        }}
      >
        {gps.busy
          ? t("Đang lấy vị trí…", "Locating…")
          : t("Đi từ vị trí hiện tại", "Start at my location")}
      </button>
      {journey.start && journey.end && (
        <div className="citizen-direction-result" role="status">
          {journey.route ? (
            <>
              <strong>
                {new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-GB", {
                  maximumFractionDigits: 2,
                }).format(journey.route.lengthKm)}{" "}
                km
              </strong>
              <p>
                {journey.route.status === "uncertain"
                  ? t(
                      "Có đoạn cần kiểm tra trước khi đi.",
                      "Some sections need checking before travel.",
                    )
                  : t(
                      "Chưa ghi nhận đoạn bị chặn trên tuyến này.",
                      "No blocked section is recorded on this route.",
                    )}
              </p>
              {(journey.start.anchor?.distance ?? 0) +
                (journey.end.anchor?.distance ?? 0) >
                1 && (
                <p>
                  {t(
                    "Đoạn từ điểm chọn đến đường chưa được kiểm tra.",
                    "Access from the chosen points to the road has not been checked.",
                  )}
                </p>
              )}
              <button
                type="button"
                className="button"
                onClick={() => {
                  journey.fit();
                  onMap();
                }}
              >
                {t("Xem đường trên bản đồ", "View route on map")}
              </button>
            </>
          ) : (
            <p>
              {journey.kind === "same-location"
                ? t("Hai điểm trùng vị trí.", "Both points are the same.")
                : journey.kind === "same-connection"
                  ? t(
                      "Hai điểm nối vào cùng một vị trí trên đường. Chưa có đường đi giữa hai điểm.",
                      "Both points connect to the same road location. A route between them is unavailable.",
                    )
                  : journey.kind === "endpoint-unavailable"
                    ? t(
                        "Vị trí đã chọn nằm ngoài mạng đường đang có dữ liệu.",
                        "A selected location is outside the available road network.",
                      )
                    : journey.kind === "blocked-network"
                      ? t(
                          "Tuyến nối hai nơi có đoạn bị chặn.",
                          "The route between these places includes a blocked section.",
                        )
                      : t(
                          "Chưa có tuyến nối hai nơi trong dữ liệu hiện tại.",
                          "No connecting route is available in this dataset.",
                        )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
