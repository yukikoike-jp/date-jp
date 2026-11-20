-- 集金で、どの払い方で払ったか(PayPay・現金・振込)。前の記録は空のまま
alter table nomi_collection_payments
  add column if not exists method text check (method in ('paypay', 'cash', 'bank'));
