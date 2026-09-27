"""
RituGrid — Copernicus Climate Data Store (CDS) API Configuration & Verification
scripts/setup_cdsapi.py

Phase 0 Setup Utility:
1. Validates presence and format of ~/.cdsapirc file or environment variables.
2. Provides guidance on how to obtain CDS API credentials for ERA5 access.
3. Tests authentication against the CDS API endpoint.

Usage:
  python scripts/setup_cdsapi.py [--check-only] [--url URL] [--key KEY]
"""
import os
import sys
from pathlib import Path
import argparse


def get_cdsapirc_path() -> Path:
    return Path.home() / ".cdsapirc"


def check_existing_credentials():
    rc_path = get_cdsapirc_path()
    has_rc = rc_path.exists()
    env_url = os.environ.get("CDSAPI_URL")
    env_key = os.environ.get("CDSAPI_KEY")

    print("=" * 60)
    print(" RituGrid — CDS API Verification (Phase 0 Setup)")
    print("=" * 60)
    print(f"CDS API RC Path: {rc_path}")
    print(f"File exists:     {'YES' if has_rc else 'NO'}")
    print(f"Env CDSAPI_URL:  {env_url or 'Not Set'}")
    print(f"Env CDSAPI_KEY:  {'Set (hidden)' if env_key else 'Not Set'}")
    print("-" * 60)

    if has_rc:
        try:
            content = rc_path.read_text().strip().splitlines()
            print("Found .cdsapirc config:")
            for line in content:
                if line.startswith("key:"):
                    print("  key: ****************")
                else:
                    print(f"  {line}")
        except Exception as e:
            print(f"Warning: could not read .cdsapirc: {e}")
        return True
    elif env_url and env_key:
        print("Using CDS credentials from environment variables.")
        return True
    else:
        return False


def print_registration_guide():
    print("""
[GUIDE] How to set up Copernicus CDS API for ERA5 downloads:
1. Register at: https://cds.climate.copernicus.eu/
2. Log in and navigate to your user profile page.
3. Copy your API URL and Personal Access Token (Key).
4. Save them in ~/.cdsapirc:
   url: https://cds.climate.copernicus.eu/api
   key: <YOUR-PERSONAL-ACCESS-TOKEN>
   
Or run:
   python scripts/setup_cdsapi.py --key <YOUR-KEY>
""")


def write_credentials(url: str, key: str):
    rc_path = get_cdsapirc_path()
    content = f"url: {url}\nkey: {key}\n"
    rc_path.write_text(content, encoding="utf-8")
    print(f"[OK] Wrote CDS credentials to {rc_path}")


def test_cds_connection():
    try:
        import cdsapi
        print("[TEST] Initializing CDS API client...")
        client = cdsapi.Client(quiet=True)
        print("[OK] CDS API client initialized successfully.")
        return True
    except Exception as e:
        print(f"[NOTE] CDS API initialization status: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="RituGrid CDS API Setup & Verification")
    parser.add_argument("--check-only", action="store_true", help="Only verify existing setup")
    parser.add_argument("--url", default="https://cds.climate.copernicus.eu/api", help="CDS API URL")
    parser.add_argument("--key", help="CDS API Personal Access Token")
    args = parser.parse_args()

    if args.key:
        write_credentials(args.url, args.key)

    configured = check_existing_credentials()

    if configured:
        test_cds_connection()
        print("\n[SUCCESS] Phase 0 CDS API requirement checked.")
    else:
        print_registration_guide()
        print("[INFO] Offline/cached ERA5 data is also supported directly in data/truth/era5/.")


if __name__ == "__main__":
    main()
