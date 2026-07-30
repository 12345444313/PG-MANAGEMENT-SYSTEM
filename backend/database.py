from supabase import create_client, Client
from config import settings

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_db() -> Client:
    """
    Dependency function that returns the Supabase client instance.
    """
    return supabase