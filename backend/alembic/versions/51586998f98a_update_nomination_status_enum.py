"""update nomination status enum

Revision ID: 51586998f98a
Revises: 2444040b87b1
Create Date: 2026-04-24 17:30:55.916559

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51586998f98a'
down_revision: Union[str, None] = '2444040b87b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename old enum type
    op.execute("ALTER TYPE nominationstatus RENAME TO nominationstatus_old")
    
    # Create new enum type
    op.execute("CREATE TYPE nominationstatus AS ENUM ('pending_manager_approval', 'pending_admin_approval', 'rejected_by_manager', 'rejected_by_admin', 'approved')")
    
    # Alter table column to use new enum type, mapping old values
    op.execute("ALTER TABLE nominations ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE nominations ALTER COLUMN status TYPE nominationstatus USING "
        "CASE WHEN lower(status::text) = 'pending' THEN 'pending_manager_approval' "
        "WHEN lower(status::text) = 'rejected' THEN 'rejected_by_admin' "
        "ELSE lower(status::text) END::nominationstatus"
    )
    
    # Drop old enum type
    op.execute("DROP TYPE nominationstatus_old")
    
    # Set default
    op.execute("ALTER TABLE nominations ALTER COLUMN status SET DEFAULT 'pending_manager_approval'")


def downgrade() -> None:
    op.execute("ALTER TYPE nominationstatus RENAME TO nominationstatus_new")
    op.execute("CREATE TYPE nominationstatus AS ENUM ('pending', 'approved', 'rejected')")
    op.execute("ALTER TABLE nominations ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE nominations ALTER COLUMN status TYPE nominationstatus USING "
        "CASE WHEN lower(status::text) = 'pending_manager_approval' THEN 'pending' "
        "WHEN lower(status::text) = 'pending_admin_approval' THEN 'pending' "
        "WHEN lower(status::text) = 'rejected_by_admin' THEN 'rejected' "
        "WHEN lower(status::text) = 'rejected_by_manager' THEN 'rejected' "
        "ELSE lower(status::text) END::nominationstatus"
    )
    op.execute("DROP TYPE nominationstatus_new")
    op.execute("ALTER TABLE nominations ALTER COLUMN status SET DEFAULT 'pending'")
