import os
import sqlite3
import json
import uuid
from datetime import datetime

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
DB_PATH = os.path.join(DB_DIR, "food_platform.db")

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)


def gen_id():
    return uuid.uuid4().hex[:20]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS donation_sessions (
            id TEXT PRIMARY KEY,
            donorType TEXT DEFAULT 'HOSTEL',
            location TEXT DEFAULT 'HOSTEL',
            status TEXT DEFAULT 'DRAFT',
            itemCount INTEGER DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT,
            confirmedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS session_items (
            id TEXT PRIMARY KEY,
            sessionId TEXT,
            food TEXT,
            imagePath TEXT,
            preparationTime TEXT,
            temperature REAL,
            storage TEXT,
            smell TEXT,
            quantity TEXT,
            status TEXT DEFAULT 'PENDING',
            analysis TEXT,
            donorDecision TEXT,
            selectedRoute TEXT,
            donationId TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            FOREIGN KEY (sessionId) REFERENCES donation_sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS donations (
            id TEXT PRIMARY KEY,
            sessionId TEXT,
            food TEXT,
            route TEXT,
            quantity TEXT,
            location TEXT,
            finalAssessment TEXT,
            animalFeedStatus TEXT,
            validationRequired INTEGER DEFAULT 0,
            validationStatus TEXT DEFAULT 'NOT_REQUIRED',
            validationDecision TEXT,
            allocationStatus TEXT DEFAULT 'PENDING_ALLOCATION',
            assignedReceiverId TEXT,
            assignedReceiverType TEXT,
            locked INTEGER DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS receivers (
            id TEXT PRIMARY KEY,
            name TEXT,
            receiverType TEXT,
            location TEXT,
            foodNeeded TEXT,
            quantityNeeded TEXT,
            available INTEGER DEFAULT 1,
            createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            recipientId TEXT,
            donationId TEXT,
            title TEXT,
            message TEXT,
            type TEXT,
            action TEXT,
            read INTEGER DEFAULT 0,
            createdAt TEXT
        );
        """)

        # Seed default receivers if empty
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM receivers")
        if cursor.fetchone()["cnt"] == 0:
            now = datetime.utcnow().isoformat()
            default_receivers = [
                (gen_id(), "Hope Children Home & Orphanage", "ORPHANAGE", "City Center", "cooked food", "MEDIUM", 1, now),
                (gen_id(), "Sunshine Shelter Home", "ORPHANAGE", "North District", "cooked food", "HIGH", 1, now),
                (gen_id(), "Green Meadow Dairy Farm", "ANIMAL_FARM", "Rural Sector 4", "vegetable scraps", "HIGH", 1, now),
                (gen_id(), "Gokul Gaushala & Animal Sanctuary", "ANIMAL_FARM", "West Suburbs", "cooked grains", "MEDIUM", 1, now),
                (gen_id(), "EcoEnergy Biogas Plant", "BIOGAS", "Industrial Area", "organic waste", "HIGH", 1, now),
                (gen_id(), "GreenSoil Biocompost Facility", "BIOCOMPOST", "Agri Zone", "organic waste", "HIGH", 1, now),
            ]
            cursor.executemany(
                "INSERT INTO receivers (id, name, receiverType, location, foodNeeded, quantityNeeded, available, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                default_receivers
            )
            conn.commit()


# Initialize database schema on load
init_db()


def clean_item_dict(row):
    d = dict(row)
    if d.get("analysis") and isinstance(d["analysis"], str):
        try:
            d["analysis"] = json.loads(d["analysis"])
        except Exception:
            pass
    return d


def create_session(donor_type="HOSTEL", location="HOSTEL"):
    session_id = gen_id()
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO donation_sessions (id, donorType, location, status, itemCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (session_id, donor_type, location, "DRAFT", 0, now, now)
        )
        conn.commit()
    return get_session(session_id)


def get_session(session_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM donation_sessions WHERE id = ?", (session_id,))
        session_row = cursor.fetchone()
        if not session_row:
            return None

        session = dict(session_row)
        cursor.execute("SELECT * FROM session_items WHERE sessionId = ? ORDER BY createdAt ASC", (session_id,))
        items = [clean_item_dict(r) for r in cursor.fetchall()]
        session["items"] = items
        session["itemCount"] = len(items)
        return session


def add_session_item(session_id, item_data):
    session = get_session(session_id)
    if not session:
        raise ValueError("Donation session not found")

    item_id = gen_id()
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO session_items 
               (id, sessionId, food, imagePath, preparationTime, temperature, storage, smell, quantity, status, analysis, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item_id,
                session_id,
                item_data.get("food"),
                item_data.get("imagePath"),
                item_data.get("preparationTime"),
                float(item_data.get("temperature", 28.0)),
                str(item_data.get("storage", "room")).lower(),
                str(item_data.get("smell", "normal")).lower(),
                item_data.get("quantity", "MEDIUM"),
                "PENDING",
                None,
                now,
                now
            )
        )
        conn.execute(
            "UPDATE donation_sessions SET itemCount = (SELECT COUNT(*) FROM session_items WHERE sessionId = ?), updatedAt = ? WHERE id = ?",
            (session_id, now, session_id)
        )
        conn.commit()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM session_items WHERE id = ?", (item_id,))
        return clean_item_dict(cursor.fetchone())


def update_session_item(session_id, item_id, update_data):
    now = datetime.utcnow().isoformat()
    fields = []
    values = []

    allowed_fields = [
        "food", "imagePath", "preparationTime", "temperature", "storage",
        "smell", "quantity", "status", "donorDecision", "selectedRoute", "donationId"
    ]

    for key in allowed_fields:
        if key in update_data and update_data[key] is not None:
            fields.append(f"{key} = ?")
            val = update_data[key]
            if key == "temperature":
                val = float(val)
            elif key in ["storage", "smell"]:
                val = str(val).lower()
            values.append(val)

    if "analysis" in update_data:
        fields.append("analysis = ?")
        val = update_data["analysis"]
        values.append(json.dumps(val) if isinstance(val, (dict, list)) else val)

    if not fields:
        return get_session_item(session_id, item_id)

    fields.append("updatedAt = ?")
    values.append(now)
    values.append(item_id)
    values.append(session_id)

    with get_db() as conn:
        conn.execute(
            f"UPDATE session_items SET {', '.join(fields)} WHERE id = ? AND sessionId = ?",
            values
        )
        conn.execute("UPDATE donation_sessions SET updatedAt = ? WHERE id = ?", (now, session_id))
        conn.commit()

    return get_session_item(session_id, item_id)


def get_session_item(session_id, item_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM session_items WHERE id = ? AND sessionId = ?", (item_id, session_id))
        row = cursor.fetchone()
        return clean_item_dict(row) if row else None


def delete_session_item(session_id, item_id):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute("DELETE FROM session_items WHERE id = ? AND sessionId = ?", (item_id, session_id))
        conn.execute(
            "UPDATE donation_sessions SET itemCount = (SELECT COUNT(*) FROM session_items WHERE sessionId = ?), updatedAt = ? WHERE id = ?",
            (session_id, now, session_id)
        )
        conn.commit()


def update_session(session_id, update_data):
    now = datetime.utcnow().isoformat()
    fields = []
    values = []

    for key in ["status", "location", "donorType", "confirmedAt"]:
        if key in update_data:
            fields.append(f"{key} = ?")
            values.append(update_data[key])

    if fields:
        fields.append("updatedAt = ?")
        values.append(now)
        values.append(session_id)
        with get_db() as conn:
            conn.execute(f"UPDATE donation_sessions SET {', '.join(fields)} WHERE id = ?", values)
            conn.commit()

    return get_session(session_id)


def create_donation(donation_data):
    donation_id = gen_id()
    now = datetime.utcnow().isoformat()
    val_req = 1 if donation_data.get("validationRequired") else 0
    with get_db() as conn:
        conn.execute(
            """INSERT INTO donations 
               (id, sessionId, food, route, quantity, location, finalAssessment, animalFeedStatus, validationRequired, validationStatus, validationDecision, allocationStatus, locked, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                donation_id,
                donation_data.get("sessionId"),
                donation_data.get("food"),
                donation_data.get("route"),
                donation_data.get("quantity"),
                donation_data.get("location", "HOSTEL"),
                donation_data.get("finalAssessment"),
                donation_data.get("animalFeedStatus"),
                val_req,
                donation_data.get("validationStatus", "PENDING" if val_req else "NOT_REQUIRED"),
                donation_data.get("validationDecision"),
                donation_data.get("allocationStatus", "PENDING_VALIDATION" if val_req else "PENDING_ALLOCATION"),
                0,
                now,
                now
            )
        )
        conn.commit()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM donations WHERE id = ?", (donation_id,))
        return dict(cursor.fetchone())


def update_donation_validation(donation_id, decision):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """UPDATE donations SET 
               validationStatus = 'COMPLETED',
               validationDecision = ?,
               allocationStatus = 'PENDING_ALLOCATION',
               updatedAt = ?
               WHERE id = ?""",
            (decision, now, donation_id)
        )
        conn.commit()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM donations WHERE id = ?", (donation_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_receivers():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM receivers ORDER BY createdAt ASC")
        return [dict(r) for r in cursor.fetchall()]


def add_receiver(data):
    rec_id = gen_id()
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO receivers (id, name, receiverType, location, foodNeeded, quantityNeeded, available, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rec_id,
                data.get("name"),
                data.get("receiverType", "ORPHANAGE"),
                data.get("location"),
                data.get("foodNeeded"),
                data.get("quantityNeeded", "MEDIUM"),
                1 if data.get("available", True) else 0,
                now
            )
        )
        conn.commit()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM receivers WHERE id = ?", (rec_id,))
        return dict(cursor.fetchone())


def get_notifications(recipient_id=None):
    with get_db() as conn:
        cursor = conn.cursor()
        if recipient_id:
            cursor.execute("SELECT * FROM notifications WHERE recipientId = ? ORDER BY createdAt DESC", (recipient_id,))
        else:
            cursor.execute("SELECT * FROM notifications ORDER BY createdAt DESC")
        return [dict(r) for r in cursor.fetchall()]
