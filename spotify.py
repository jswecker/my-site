import os
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth

load_dotenv()

SCOPE = "user-modify-playback-state user-read-playback-state"

def get_spotify_client() -> spotipy.Spotify:
    return spotipy.Spotify(
        auth_manager=SpotifyOAuth(
            scope=SCOPE,
            client_id=os.environ["SPOTIPY_CLIENT_ID"],
            client_secret=os.environ["SPOTIPY_CLIENT_SECRET"],
            redirect_uri=os.environ["SPOTIPY_REDIRECT_URI"],
            open_browser=True,
        )
    )

def pick_device(sp: spotipy.Spotify) -> str | None:
    devices = sp.devices().get("devices", [])
    if not devices:
        return None
    # Prefer active device if present
    active = next((d for d in devices if d.get("is_active")), None)
    return (active or devices[0]).get("id")

def queue_track_uri(sp: spotipy.Spotify, track_uri: str, device_id: str | None = None) -> None:
    # Adds to the end of the queue
    sp.add_to_queue(uri=track_uri, device_id=device_id)

def track_uri_from_search(sp: spotipy.Spotify, query: str) -> str:
    res = sp.search(q=query, type="track", limit=1)
    items = res.get("tracks", {}).get("items", [])
    if not items:
        raise RuntimeError(f"No track found for query: {query}")
    return items[0]["uri"]

if __name__ == "__main__":
    sp = get_spotify_client()

    device_id = pick_device(sp)
    if device_id is None:
        raise RuntimeError(
            "No Spotify devices found. Open Spotify on a phone/desktop, start playing something, then retry."
        )

    # Option A: queue by Spotify track URL/URI
    # Examples:
    #   "spotify:track:4cOdK2wGLETKBW3PvgPWqT"
    #   "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=..."
    track = "spotify:track:4cOdK2wGLETKBW3PvgPWqT"

    # If they give you a URL, Spotipy can usually accept it as `uri`, but if it fails,
    # convert URL -> URI yourself (or just paste the spotify:track:... form).
    queue_track_uri(sp, track_uri=track, device_id=device_id)
    print("Queued:", track)

    # Option B: queue the first search result
    # query = "Mr. Brightside The Killers"
    # uri = track_uri_from_search(sp, query)
    # queue_track_uri(sp, track_uri=uri, device_id=device_id)
    # print("Queued:", uri)
