import { FLOW_GROUPS, PRESSURE_UNITS, SIGNALS, type Quantity } from '../utils/conversion';

// <option> untuk dropdown satuan. Flow dikelompokkan (volumetrik / gas standar / massa) karena
// daftarnya panjang dan jenisnya menentukan apakah konversi butuh densitas.
export function FlowOptions() {
  return (
    <>
      {FLOW_GROUPS.map((group) => (
        <optgroup key={group.kind} label={group.label}>
          {group.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function PressureOptions() {
  return (
    <>
      {PRESSURE_UNITS.map((u) => (
        <option key={u.id} value={u.id}>
          {u.label}
        </option>
      ))}
    </>
  );
}

export function SignalOptions() {
  return (
    <>
      {SIGNALS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </>
  );
}

export function UnitOptions({ quantity }: { quantity: Quantity }) {
  if (quantity === 'pressure') return <PressureOptions />;
  if (quantity === 'signal') return <SignalOptions />;
  return <FlowOptions />;
}
