import type {Sample} from '@illustro/brush-rt';

/**
 * Native pointer sensors are supplied only when the platform exposes the
 * corresponding value. Non-pen pressure is not evidence of physical pressure.
 *
 * Pointer Events specifies twist in degrees and azimuthAngle in radians;
 * Foundation's normalized samples use radians for both azimuth and twist.
 * Sensor support itself cannot be inferred reliably from a zero reading.
 */
export function nativeBrushSensors(event:PointerEvent):Partial<Sample>{
  if(event.pointerType!=='pen')return {pointerType:event.pointerType};
  const azimuth=(event as PointerEvent&{azimuthAngle?:number}).azimuthAngle;
  return {
    pointerType:'pen',
    ...(Number.isFinite(event.pressure)?{pressure:event.pressure}:{}),
    ...(Number.isFinite(event.tiltX)&&Number.isFinite(event.tiltY)?{tilt:Math.min(1,Math.hypot(event.tiltX,event.tiltY)/90)}:{}),
    ...(typeof azimuth==='number'&&Number.isFinite(azimuth)?{azimuth}:{}),
    ...(Number.isFinite(event.twist)?{twist:event.twist*Math.PI/180}:{})
  };
}
