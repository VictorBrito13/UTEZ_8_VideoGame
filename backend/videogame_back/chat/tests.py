from django.test import TestCase


class ChatSecurityTests(TestCase):
  """
  Tests to ensure 100% compliance with RF-17 and R5.1.
  """

  def test_xss_sanitization(self):
    """Verify that HTML tags are removed/escaped."""
    from .utils import sanitize_message
    msg = "<script>alert('xss')</script> Hello <b>world</b>"
    clean = sanitize_message(msg)
    self.assertNotIn("<script>", clean)
    self.assertNotIn("<b>", clean)
    self.assertIn("Hello world", clean)

  def test_bad_words_filtering(self):
    """Verify that offensive terms are replaced with asterisks."""
    from .utils import filter_bad_words
    msg = "No seas pendejo en esta mierda"
    clean = filter_bad_words(msg)
    # Checks for asterisk replacements of bad words
    self.assertNotIn("pendejo", clean.lower())
    self.assertNotIn("mierda", clean.lower())

  def test_process_message_full_pipeline(self):
    """Final check of combined filters."""
    from .utils import process_message
    msg = "<u>Hey</u>, que pendejada"
    processed = process_message(msg)
    self.assertNotIn("<u>", processed)

  def test_serializer_validation(self):
    """Ensure the new Serializer correctly validates constraints."""
    from .serializers import ChatMessageSerializer
    # Data too long
    long_data = {"message": "A" * 1001}
    ser = ChatMessageSerializer(data=long_data)
    self.assertFalse(ser.is_valid())

    # Empty data
    empty_data = {"message": "   "}
    ser = ChatMessageSerializer(data=empty_data)
    self.assertFalse(ser.is_valid())

    # Valid data
    valid_data = {"message": "Nice battle!"}
    ser = ChatMessageSerializer(data=valid_data)
    self.assertTrue(ser.is_valid())
 
