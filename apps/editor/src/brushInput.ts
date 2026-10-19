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
  const sensors:Partial<Sample>={pointerType:'pen'};
  if(Number.isFinite(event.pressure))sensors.pressure=event.pressure;
  if(Number.isFinite(event.tiltX)&&Number.isFinite(event.tiltY)){
    sensors.tilt=Math.min(1,Math.hypot(event.tiltX,event.tiltY)/90);
  }
  const azimuth=(event as PointerEvent&{azimuthAngle?:number}).azimuthAngle;
  if(typeof azimuth==='number'&&Number.isFinite(azimuth))sensors.azimuth=azimuth;
  if(Number.isFinite(event.twist))sensors.twist=event.twist*Math.PI/180;
  return sensors;
}
