from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver
from django.db import connection
from .models import AuditLog
from core.middleware import get_current_user, get_current_ip


def table_exists(table_name):
  return table_name in connection.introspection.table_names()


def model_to_dict(instance):
  data = {}
  for field in instance._meta.fields:
    data[field.name] = str(getattr(instance, field.name))
  return data


# 🔥 Guardamos estado anterior antes del update
@receiver(pre_save)
def cache_old_instance(sender, instance, **kwargs):
  if sender == AuditLog:
    return

  if instance.pk:
    try:
      instance._old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
      instance._old_instance = None


@receiver(post_save)
def audit_save(sender, instance, created, **kwargs):
  if sender == AuditLog:
    return

  # 🚫 evitar error durante migrate
  if not table_exists("audit_auditlog"):
    return

  table_name = sender.__name__
  new_data = model_to_dict(instance)

  if created:
    for field, value in new_data.items():
      AuditLog.objects.create(
        table_name=table_name,
        record_id=instance.pk,
        action="CREATE",
        field_name=field,
        new_value=value,
        user=get_current_user(),
        host=get_current_ip(),
      )
  else:
    old_instance = getattr(instance, "_old_instance", None)
    if not old_instance:
      return

    old_data = model_to_dict(old_instance)

    for field in new_data:
      if old_data.get(field) != new_data.get(field):
        AuditLog.objects.create(
          table_name=table_name,
          record_id=instance.pk,
          action="UPDATE",
          field_name=field,
          old_value=old_data.get(field),
          new_value=new_data.get(field),
          user=get_current_user(),
          host=get_current_ip(),
        )


@receiver(pre_delete)
def audit_delete(sender, instance, **kwargs):
  if sender == AuditLog:
    return

  if not table_exists("audit_auditlog"):
    return

  table_name = sender.__name__
  data = model_to_dict(instance)

  for field, value in data.items():
    AuditLog.objects.create(
      table_name=table_name,
      record_id=instance.pk,
      action="DELETE",
      field_name=field,
      old_value=value,
      user=get_current_user(),
      host=get_current_ip(),
    )
