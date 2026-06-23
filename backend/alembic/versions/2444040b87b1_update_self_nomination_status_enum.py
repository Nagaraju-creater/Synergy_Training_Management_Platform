"""update self nomination status enum

Revision ID: 2444040b87b1
Revises: c211caf9b272
Create Date: 2026-04-24 16:51:12.533496

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2444040b87b1'
down_revision: Union[str, None] = 'c211caf9b272'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename old enum type
    op.execute("ALTER TYPE selfnominationstatus RENAME TO selfnominationstatus_old")
    
    # Create new enum type
    op.execute("CREATE TYPE selfnominationstatus AS ENUM ('pending_manager_approval', 'pending_admin_approval', 'rejected_by_manager', 'rejected_by_admin', 'approved', 'converted')")
    
    # Alter table column to use new enum type, mapping old values
    op.execute("ALTER TABLE self_nominations ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE self_nominations ALTER COLUMN status TYPE selfnominationstatus USING "
        "CASE WHEN lower(status::text) = 'pending' THEN 'pending_manager_approval' "
        "WHEN lower(status::text) = 'rejected' THEN 'rejected_by_admin' "
        "ELSE lower(status::text) END::selfnominationstatus"
    )
    
    # Drop old enum type
    op.execute("DROP TYPE selfnominationstatus_old")
    
    # Set default
    op.execute("ALTER TABLE self_nominations ALTER COLUMN status SET DEFAULT 'pending_manager_approval'")


def downgrade() -> None:
    op.execute("ALTER TYPE selfnominationstatus RENAME TO selfnominationstatus_new")
    op.execute("CREATE TYPE selfnominationstatus AS ENUM ('pending', 'approved', 'rejected', 'converted')")
    op.execute("ALTER TABLE self_nominations ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE self_nominations ALTER COLUMN status TYPE selfnominationstatus USING "
        "CASE WHEN lower(status::text) = 'pending_manager_approval' THEN 'pending' "
        "WHEN lower(status::text) = 'pending_admin_approval' THEN 'pending' "
        "WHEN lower(status::text) = 'rejected_by_admin' THEN 'rejected' "
        "WHEN lower(status::text) = 'rejected_by_manager' THEN 'rejected' "
        "ELSE lower(status::text) END::selfnominationstatus"
    )
    op.execute("DROP TYPE selfnominationstatus_new")
    op.execute("ALTER TABLE self_nominations ALTER COLUMN status SET DEFAULT 'pending'")
