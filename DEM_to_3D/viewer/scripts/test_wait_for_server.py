import unittest
from unittest.mock import MagicMock, patch
from urllib.error import URLError
from wait_for_server import wait_for_server


class ServerReadinessTests(unittest.TestCase):
    def response(self, status):
        response = MagicMock()
        response.__enter__.return_value.status = status
        return response

    @patch('wait_for_server.time.sleep')
    @patch('wait_for_server.urlopen')
    def test_retries_connection_refusal_until_ready(self, open_url, sleep):
        open_url.side_effect = [URLError('refused'), self.response(200)]
        wait_for_server('http://localhost:5213')
        self.assertEqual(open_url.call_count, 2)
        sleep.assert_called_once()

    @patch('wait_for_server.time.sleep')
    @patch('wait_for_server.urlopen')
    def test_does_not_accept_a_non_success_response(self, open_url, sleep):
        open_url.side_effect = [self.response(503), self.response(200)]
        wait_for_server('http://localhost:5213')
        self.assertEqual(open_url.call_count, 2)

    @patch('wait_for_server.time.monotonic', side_effect=[0, 0, 15])
    @patch('wait_for_server.urlopen', side_effect=URLError('refused'))
    def test_fails_when_server_never_becomes_ready(self, open_url, clock):
        with self.assertRaisesRegex(TimeoutError, 'did not become ready'):
            wait_for_server('http://localhost:5213', timeout=15)


if __name__ == '__main__':
    unittest.main()
