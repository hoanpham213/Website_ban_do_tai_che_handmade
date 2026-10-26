// Sổ địa chỉ. RLS: chỉ thao tác trên địa chỉ của chính mình.
import { supabase } from '../lib/supabase.js';

const FIELDS = 'id, recipient_name, recipient_phone, province, ward, street_address, is_default';

export async function listAddresses() {
  const { data, error } = await supabase
    .from('addresses')
    .select(FIELDS)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

function toRow(address) {
  return {
    recipient_name: address.recipientName.trim(),
    recipient_phone: address.recipientPhone.trim(),
    province: address.province.trim(),
    ward: address.ward.trim(),
    street_address: address.streetAddress.trim(),
  };
}

export async function createAddress(address) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('NOT_AUTHENTICATED');

  const { data, error } = await supabase
    .from('addresses')
    .insert({ ...toRow(address), user_id: userId })
    .select(FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateAddress(id, address) {
  const { error } = await supabase.from('addresses').update(toRow(address)).eq('id', id);
  if (error) throw error;
}

export async function deleteAddress(id) {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}

export async function setDefaultAddress(id) {
  const { error } = await supabase.rpc('set_default_address', { p_address_id: id });
  if (error) throw error;
}
