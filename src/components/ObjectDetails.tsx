import { MapPin } from 'lucide-react'
import { categoryLabels } from '../constants/mapConfig'
import type { MapObject } from '../types/map'
import { getObjectDisplayName } from '../utils/locationLabels'
import { formatGameCoordinates } from '../utils/mapCoordinates'

type ObjectDetailsProps = {
  // 当前选中的地图对象；为空时显示右侧空状态。
  selectedObject: MapObject | null
}

// 右侧对象详情面板；只负责展示当前选中对象的基础信息，不参与地图筛选和数据加载。
export function ObjectDetails({ selectedObject }: ObjectDetailsProps) {
  return (
    <aside className="details" aria-label="Selected object details">
      {selectedObject ? (
        <>
          <div className="detail-header">
            <p>{categoryLabels[selectedObject.category]}</p>
            <h2>{getObjectDisplayName(selectedObject)}</h2>
          </div>
          <dl>
            <div>
              <dt>Actor</dt>
              <dd>{selectedObject.actor}</dd>
            </div>
            <div>
              <dt>Layer</dt>
              <dd>{selectedObject.layer}</dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>{formatGameCoordinates(selectedObject)}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{selectedObject.tags.join(', ')}</dd>
            </div>
          </dl>
          <p className="detail-note">{selectedObject.note}</p>
        </>
      ) : (
        <div className="empty-state">
          <MapPin size={24} />
          <h2>No object selected</h2>
          <p>Choose a result or click a marker on the map.</p>
        </div>
      )}
    </aside>
  )
}
